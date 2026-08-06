"use client";

import { useEffect, useRef, useState } from "react";
import {
  findByName,
  priceFor,
  priceLabel,
  UNIT_LABELS,
  type RateUnit,
  type Service,
} from "@/lib/service";
import type { Remembered } from "@/lib/customer-memory";
import {
  dollarsToCents,
  formatCents,
  MAX_CENTS,
  type Transaction,
  type TransactionDirection,
} from "@/lib/transaction";

/**
 * Amount first. You get paid $60 cash in a driveway and the very first thing
 * your thumb does is type 6-0-0-0. Everything else is optional.
 *
 * Service chips are the faster path once the catalog exists: one tap fills
 * the amount (flat), or asks "how many?" and multiplies (rate). Logging a
 * business amount with no chip offers to save it as a service afterwards —
 * that's how the catalog gets built, one real job at a time.
 *
 * Ordering rule: the payment is handed up via onSave BEFORE the prompt
 * appears. "Logged" on screen must mean logged — if the tab dies at the
 * prompt, the payment survives and only the service link is lost.
 */

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

/** Local calendar date. toISOString would give UTC — tomorrow's date for an
 *  evening payment anywhere in the Americas. */
const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Which half of a toggle is on has to read at a glance, one-handed, outdoors.
 * The old pairing was bg-foreground for the pressed side against bg-white for
 * the other — in dark mode those are both near-white, so nothing looked
 * chosen. Now the pressed side is a filled pill in the app's money colors and
 * the other side goes quiet.
 */
const segment = (on: boolean, onClass: string): string =>
  `flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
    on
      ? onClass
      : "border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50"
  }`;

const labelClass = "mb-1 block text-xs font-medium text-neutral-500";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

type PricingChoice = "flat" | RateUnit;

const unitQuestion = (unit: RateUnit): string =>
  unit === "sqft" ? "How many sq ft?" : `How many ${UNIT_LABELS[unit]}s?`;

/** "Log again" hands these in: last time's details, today's date. */
export type QuickAddPrefill = {
  payer: string;
  amountCents: number;
  serviceId: string | null;
  /** Last time's units — without it, re-saving would erase remembered size. */
  quantity: number | null;
  business: boolean;
  direction: TransactionDirection;
};

export default function QuickAdd({
  services,
  prefill,
  remember,
  payerSuggestions,
  onSave,
  onCreateService,
  onLinkService,
  onClose,
}: {
  services: Service[];
  prefill?: QuickAddPrefill;
  /** What this payer paid last time for a service — see customer-memory. */
  remember: (payer: string, serviceId: string) => Remembered | undefined;
  payerSuggestions: string[];
  onSave: (tx: Transaction) => void;
  onCreateService: (service: Service) => void;
  onLinkService: (txId: string, serviceId: string) => void;
  onClose: () => void;
}) {
  const [cents, setCents] = useState(prefill?.amountCents ?? 0);
  const [payer, setPayer] = useState(prefill?.payer ?? "");
  const [date, setDate] = useState(today);
  const [business, setBusiness] = useState(prefill?.business ?? true);
  const [direction, setDirection] = useState<TransactionDirection>(
    prefill?.direction ?? "in",
  );
  const [justSaved, setJustSaved] = useState("");
  const spending = direction === "out";

  // Chip + mini-calc state. fromChip marks an amount the user didn't type,
  // so the next digit starts a fresh number instead of appending.
  const [selected, setSelected] = useState<Service | null>(
    () => services.find((s) => s.id === prefill?.serviceId) ?? null,
  );
  const [qty, setQty] = useState(
    prefill?.quantity != null ? String(prefill.quantity) : "",
  );
  const [fromChip, setFromChip] = useState(Boolean(prefill));
  /** True only while amount+qty are untouched auto-fill (chip default or
   *  memory). The moment the user edits either, their numbers win — typing
   *  a payer name must never overwrite a hand-entered quantity. */
  const [autoFilled, setAutoFilled] = useState(false);
  /** "Rosa's usual: $200 (4000 sq ft)" — shown when memory prefilled. */
  const [usualHint, setUsualHint] = useState("");

  // The save-as-service prompt. The payment is ALREADY saved by the time this
  // is set — it holds only what's needed to link the new service afterwards.
  const [pending, setPending] = useState<{
    txId: string;
    amountCents: number;
    stay: boolean;
  } | null>(null);
  const [promptName, setPromptName] = useState("");
  const [promptPricing, setPromptPricing] = useState<PricingChoice>("flat");
  const [promptRate, setPromptRate] = useState("");
  const [promptCost, setPromptCost] = useState("");

  // Desktop: type amounts on the physical keyboard. Ignored while focus is
  // in a text field, and while the save-as-service prompt is up.
  const pressRef = useRef<(key: string) => void>(() => {});
  const promptOpenRef = useRef(false);
  useEffect(() => {
    pressRef.current = press;
    promptOpenRef.current = pending !== null;
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (promptOpenRef.current) return;
      // A chord is a browser command, not a digit. Cmd+0 resets zoom — and
      // without this it also turned $60.00 into $600.00 and saved it.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[0-9]$/.test(event.key)) pressRef.current(event.key);
      else if (event.key === "Backspace") pressRef.current("⌫");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function press(key: string) {
    // Typing overrides the mini-calc but keeps the service link — a custom
    // price for this job is still that service.
    setQty("");
    setAutoFilled(false);
    if (fromChip) {
      // First keystroke after a chip fill starts fresh: tapping the chip
      // then typing 7 means $0.07, not $650.07.
      setFromChip(false);
      setCents(key === "⌫" ? 0 : Number(key));
      return;
    }
    if (key === "⌫") {
      setCents((current) => Math.floor(current / 10));
      return;
    }
    setCents((current) => {
      const next = current * 10 + Number(key);
      return next > MAX_CENTS ? current : next;
    });
  }

  /** Chip defaults — or this payer's remembered price and size, if known. */
  function applyChip(service: Service, payerName: string) {
    const past = remember(payerName, service.id);
    if (past) {
      setCents(Math.min(MAX_CENTS, past.amountCents));
      setQty(past.quantity != null ? String(past.quantity) : "");
      const size =
        past.quantity != null && service.pricing.type === "rate"
          ? ` (${past.quantity} ${
              service.pricing.unit === "sqft"
                ? "sq ft"
                : UNIT_LABELS[service.pricing.unit] +
                  (past.quantity === 1 ? "" : "s")
            })`
          : "";
      setUsualHint(
        `${payerName.trim()}'s usual: ${formatCents(past.amountCents)}${size}`,
      );
    } else {
      // One tap = one unit. "1" is right for an hour or a room, and for
      // sqft it's a visible starting point the user immediately overtypes.
      setQty("1");
      setCents(Math.min(MAX_CENTS, priceFor(service, 1)));
      setUsualHint("");
    }
    setFromChip(true);
    setAutoFilled(true);
  }

  function tapChip(service: Service) {
    if (selected?.id === service.id) {
      setSelected(null);
      setQty("");
      setCents(0);
      setFromChip(false);
      setAutoFilled(false);
      setUsualHint("");
      return;
    }
    setSelected(service);
    applyChip(service, payer);
  }

  function changePayer(value: string) {
    setPayer(value);
    // Re-apply memory only while everything on screen is still auto-fill —
    // typing "Rosa" swaps in Rosa's price, but never clobbers a quantity or
    // amount the user entered by hand.
    if (selected && autoFilled && !spending) applyChip(selected, value);
  }

  function changeQty(value: string) {
    setQty(value);
    const quantity = Number.parseFloat(value);
    // Clamped: a stray "1e9" sqft must not overflow the amount column.
    setCents(selected ? Math.min(MAX_CENTS, priceFor(selected, quantity)) : 0);
    setFromChip(true);
    // A hand-typed size is the user's — memory must not overwrite it.
    setAutoFilled(false);
  }

  function build(): Transaction {
    return {
      // A real uuid, because this id becomes the primary key in Postgres.
      id: crypto.randomUUID(),
      payer: payer.trim(),
      amountCents: cents,
      date,
      memo: "",
      source: "manual",
      direction,
      // Chips are things you SELL — they don't apply to money out.
      serviceId: spending ? null : (selected?.id ?? null),
      quantity: quantityForSave(),
      business,
      confidence: {},
    };
  }

  /** Units are only meaningful on a rate-chip income log with a valid qty. */
  function quantityForSave(): number | null {
    if (spending || selected?.pricing.type !== "rate") return null;
    const parsed = Number.parseFloat(qty);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  /** Reset for the next entry (keep date + business/personal) or close. */
  function finish(stay: boolean, savedCents: number) {
    if (!stay) {
      onClose();
      return;
    }
    setJustSaved(
      spending
        ? `−${formatCents(savedCents)} logged`
        : `${formatCents(savedCents)} logged`,
    );
    setCents(0);
    setPayer("");
    setSelected(null);
    setQty("");
    setFromChip(false);
    setAutoFilled(false);
    setUsualHint("");
  }

  function save(stay: boolean) {
    if (cents === 0) return;
    const tx = build();

    // The payment is saved NOW, unconditionally. Everything after this line
    // is optional decoration.
    onSave(tx);

    // Offer the catalog only for business INCOME without a chip — a personal
    // repayment isn't a service you sell, and neither is an expense.
    if (!tx.serviceId && tx.business === true && tx.direction === "in") {
      setPending({ txId: tx.id, amountCents: tx.amountCents, stay });
      return;
    }
    finish(stay, tx.amountCents);
  }

  function promptSave() {
    if (!pending) return;
    const name = promptName.trim();
    if (!name) return;

    // Same name as an existing service? Link to it instead of duplicating.
    const existing = findByName(services, name);
    let serviceId: string;

    if (existing) {
      serviceId = existing.id;
    } else {
      const service: Service = {
        id: crypto.randomUUID(),
        name,
        pricing:
          promptPricing === "flat"
            ? { type: "flat", cents: pending.amountCents }
            : { type: "rate", cents: dollarsToCents(promptRate), unit: promptPricing },
        costCents: promptCost.trim() === "" ? null : dollarsToCents(promptCost),
      };
      onCreateService(service);
      serviceId = service.id;
    }

    onLinkService(pending.txId, serviceId);
    finish(pending.stay, pending.amountCents);
    resetPrompt();
  }

  function promptSkip() {
    if (!pending) return;
    finish(pending.stay, pending.amountCents);
    resetPrompt();
  }

  function resetPrompt() {
    setPending(null);
    setPromptName("");
    setPromptPricing("flat");
    setPromptRate("");
    setPromptCost("");
  }

  // ---- Save-as-service prompt: its own screen, one thing at a time. ----
  if (pending) {
    const rateChosen = promptPricing !== "flat";
    return (
      <div className="space-y-4">
        <p aria-live="polite" className="text-sm text-emerald-600">
          {formatCents(pending.amountCents)} logged
        </p>
        <h2 className="text-sm font-semibold">
          Save this as a service for one-tap logging?
        </h2>

        <div>
          <label className={labelClass} htmlFor="svc-name">
            What do you call this job?
          </label>
          <input
            id="svc-name"
            className={fieldClass}
            placeholder="Lawn mowing"
            value={promptName}
            onChange={(event) => setPromptName(event.target.value)}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>How do you price it?</legend>
          <div className="grid grid-cols-4 gap-2">
            {(["flat", "hour", "room", "sqft"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={promptPricing === choice}
                className={`rounded-lg px-2 py-2 text-sm font-medium ${
                  promptPricing === choice
                    ? "bg-foreground text-background"
                    : "border border-neutral-300 bg-white text-neutral-900"
                }`}
                onClick={() => setPromptPricing(choice)}
              >
                {choice === "flat"
                  ? `Flat ${formatCents(pending.amountCents)}`
                  : `per ${UNIT_LABELS[choice]}`}
              </button>
            ))}
          </div>
        </fieldset>

        {rateChosen && (
          <div>
            <label className={labelClass} htmlFor="svc-rate">
              Price per {UNIT_LABELS[promptPricing as RateUnit]}
            </label>
            <input
              id="svc-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className={fieldClass}
              placeholder="0.00"
              value={promptRate}
              onChange={(event) => setPromptRate(event.target.value)}
            />
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="svc-cost">
            What it costs you{rateChosen ? ` per ${UNIT_LABELS[promptPricing as RateUnit]}` : ""} (optional)
          </label>
          <input
            id="svc-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={fieldClass}
            placeholder="gas, supplies…"
            value={promptCost}
            onChange={(event) => setPromptCost(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
            disabled={
              promptName.trim() === "" ||
              (rateChosen && dollarsToCents(promptRate) === 0)
            }
            onClick={promptSave}
          >
            Save service
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-neutral-400 px-4 py-4 text-base font-medium text-foreground hover:opacity-80"
            onClick={promptSkip}
          >
            No thanks
          </button>
        </div>
      </div>
    );
  }

  // ---- The numpad. ----
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">
          {spending ? "Log money you spent" : "Log a cash payment"}
        </h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="flex gap-2" role="group" aria-label="Money in or out">
        <button
          type="button"
          aria-pressed={!spending}
          className={segment(!spending, "bg-emerald-700 text-white")}
          onClick={() => setDirection("in")}
        >
          Got paid
        </button>
        <button
          type="button"
          aria-pressed={spending}
          className={segment(spending, "bg-red-600 text-white")}
          onClick={() => {
            setDirection("out");
            // Chips price what you SELL. Left selected, the rate mini-calc
            // would keep computing this expense from your selling rate.
            setSelected(null);
            setQty("");
            // An amount the user didn't type doesn't survive the switch —
            // clearing fromChip alone would leave a chip/memory-filled $200
            // that the next digit APPENDS to ($2,000.07 instead of $0.07).
            // A hand-typed amount is the user's and stays.
            if (fromChip) setCents(0);
            setFromChip(false);
            setAutoFilled(false);
            setUsualHint("");
          }}
        >
          Spent
        </button>
      </div>

      {!spending && services.length > 0 && (
        <div
          className="flex max-h-24 flex-wrap gap-2 overflow-y-auto"
          role="group"
          aria-label="Services"
        >
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              aria-pressed={selected?.id === service.id}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                selected?.id === service.id
                  ? "bg-emerald-600 text-white"
                  : "border border-neutral-300 bg-white text-neutral-900"
              }`}
              onClick={() => tapChip(service)}
            >
              {service.name} · {priceLabel(service)}
            </button>
          ))}
        </div>
      )}

      {/* The number is where the eye lands, so it carries the direction too:
          a minus sign and red for money out. Between this and the filled
          toggle above, "which way is this going" is answered twice. */}
      <div className="text-center">
        <p
          aria-live="polite"
          className={`text-5xl font-semibold tabular-nums ${
            spending ? "text-red-500" : ""
          }`}
        >
          {spending && "−"}
          {formatCents(cents)}
        </p>
        <p
          // Paired shades: the caption sits on the page background, and no
          // single green or red clears 4.5:1 against both white and near-black.
          className={`mt-1 text-xs font-medium uppercase tracking-wide ${
            spending
              ? "text-red-700 dark:text-red-400"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {spending ? "Money out" : "Money in"}
        </p>
      </div>

      {!spending && selected?.pricing.type === "rate" && (
        <div className="mx-auto flex w-56 items-center gap-2">
          <label className="text-sm text-neutral-500" htmlFor="qty">
            {unitQuestion(selected.pricing.unit)}
          </label>
          <input
            id="qty"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className={`${fieldClass} w-20 text-center`}
            value={qty}
            onChange={(event) => changeQty(event.target.value)}
          />
        </div>
      )}

      {usualHint && (
        <p aria-live="polite" className="text-center text-xs text-emerald-600">
          {usualHint}
        </p>
      )}

      {justSaved && (
        <p aria-live="polite" className="text-center text-sm text-emerald-600">
          {justSaved}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key, index) =>
          key === "" ? (
            <span key={`gap-${index}`} />
          ) : (
            <button
              key={key}
              type="button"
              aria-label={key === "⌫" ? "Delete" : key}
              className="rounded-lg border border-neutral-300 bg-white py-4 text-xl font-medium text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
              onClick={() => press(key)}
            >
              {key}
            </button>
          ),
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={business}
          className={segment(business, "bg-emerald-700 text-white")}
          onClick={() => setBusiness(true)}
        >
          Business
        </button>
        <button
          type="button"
          aria-pressed={!business}
          // Grey, not the money colours: personal isn't a third direction.
          className={segment(!business, "bg-neutral-500 text-white")}
          onClick={() => setBusiness(false)}
        >
          Personal
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass} htmlFor="quick-payer">
            {spending ? "Where (optional)" : "Who paid (optional)"}
          </label>
          <input
            id="quick-payer"
            className={fieldClass}
            placeholder={spending ? "Gas station" : "Name"}
            value={payer}
            list={spending ? undefined : "known-payers"}
            onChange={(event) => changePayer(event.target.value)}
          />
          {!spending && (
            <datalist id="known-payers">
              {payerSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          )}
        </div>
        <div className="w-40">
          <label className={labelClass} htmlFor="quick-date">
            Date
          </label>
          <input
            id="quick-date"
            type="date"
            className={fieldClass}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
          disabled={cents === 0}
          onClick={() => save(false)}
        >
          Save
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg border border-neutral-400 px-4 py-4 text-base font-medium text-foreground hover:opacity-80 disabled:opacity-40"
          disabled={cents === 0}
          onClick={() => save(true)}
        >
          Save &amp; add another
        </button>
      </div>
    </div>
  );
}
