"use client";

import { useState } from "react";
import {
  findByName,
  priceFor,
  priceLabel,
  UNIT_LABELS,
  type RateUnit,
  type Service,
} from "@/lib/service";
import {
  dollarsToCents,
  formatCents,
  MAX_CENTS,
  type Transaction,
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

const labelClass = "mb-1 block text-xs font-medium text-neutral-500";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

type PricingChoice = "flat" | RateUnit;

const unitQuestion = (unit: RateUnit): string =>
  unit === "sqft" ? "How many sq ft?" : `How many ${UNIT_LABELS[unit]}s?`;

export default function QuickAdd({
  services,
  onSave,
  onCreateService,
  onLinkService,
  onClose,
}: {
  services: Service[];
  onSave: (tx: Transaction) => void;
  onCreateService: (service: Service) => void;
  onLinkService: (txId: string, serviceId: string) => void;
  onClose: () => void;
}) {
  const [cents, setCents] = useState(0);
  const [payer, setPayer] = useState("");
  const [date, setDate] = useState(today);
  const [business, setBusiness] = useState(true);
  const [justSaved, setJustSaved] = useState("");

  // Chip + mini-calc state. fromChip marks an amount the user didn't type,
  // so the next digit starts a fresh number instead of appending.
  const [selected, setSelected] = useState<Service | null>(null);
  const [qty, setQty] = useState("");
  const [fromChip, setFromChip] = useState(false);

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

  function press(key: string) {
    // Typing overrides the mini-calc but keeps the service link — a custom
    // price for this job is still that service.
    setQty("");
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

  function tapChip(service: Service) {
    if (selected?.id === service.id) {
      setSelected(null);
      setQty("");
      setCents(0);
      setFromChip(false);
      return;
    }
    setSelected(service);
    // One tap = one unit. "1" is right for an hour or a room, and for sqft
    // it's a visible starting point the user immediately overtypes.
    setQty("1");
    setCents(Math.min(MAX_CENTS, priceFor(service, 1)));
    setFromChip(true);
  }

  function changeQty(value: string) {
    setQty(value);
    const quantity = Number.parseFloat(value);
    // Clamped: a stray "1e9" sqft must not overflow the amount column.
    setCents(selected ? Math.min(MAX_CENTS, priceFor(selected, quantity)) : 0);
    setFromChip(true);
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
      serviceId: selected?.id ?? null,
      business,
      confidence: {},
    };
  }

  /** Reset for the next entry (keep date + business/personal) or close. */
  function finish(stay: boolean, savedCents: number) {
    if (!stay) {
      onClose();
      return;
    }
    setJustSaved(`${formatCents(savedCents)} logged`);
    setCents(0);
    setPayer("");
    setSelected(null);
    setQty("");
    setFromChip(false);
  }

  function save(stay: boolean) {
    if (cents === 0) return;
    const tx = build();

    // The payment is saved NOW, unconditionally. Everything after this line
    // is optional decoration.
    onSave(tx);

    // Offer the catalog only for business income without a chip — a personal
    // repayment from a friend is not a service you sell.
    if (!tx.serviceId && tx.business === true) {
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
        <h2 className="text-sm font-semibold">Log a cash payment</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {services.length > 0 && (
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

      <p
        aria-live="polite"
        className="text-center text-5xl font-semibold tabular-nums"
      >
        {formatCents(cents)}
      </p>

      {selected?.pricing.type === "rate" && (
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
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium ${
            business
              ? "bg-emerald-600 text-white"
              : "border border-neutral-300 bg-white text-neutral-900"
          }`}
          onClick={() => setBusiness(true)}
        >
          Business
        </button>
        <button
          type="button"
          aria-pressed={!business}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium ${
            business
              ? "border border-neutral-300 bg-white text-neutral-900"
              : "bg-foreground text-background"
          }`}
          onClick={() => setBusiness(false)}
        >
          Personal
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass} htmlFor="quick-payer">
            Who paid (optional)
          </label>
          <input
            id="quick-payer"
            className={fieldClass}
            placeholder="Name"
            value={payer}
            onChange={(event) => setPayer(event.target.value)}
          />
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
