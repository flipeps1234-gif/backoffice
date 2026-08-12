"use client";

import { useMemo, useState } from "react";
import ProductCard from "./product-card";
import { findClientByName, type Client } from "@/lib/client";
import {
  advance,
  cadenceLabel,
  type Cadence,
  type RecurringTemplate,
} from "@/lib/recurring";
import {
  lineFromService,
  saleTotalCents,
  type LineItem,
  type PaymentMethod,
  type Sale,
} from "@/lib/sale";
import { UNIT_LABELS, type Service } from "@/lib/service";
import { dollarsToCents, formatCents } from "@/lib/transaction";

/**
 * The sale flow — FLOW.md's left column: PICK PRODUCTS → CHECKOUT →
 * PAID? → cash/digital. The tree exists; the happy path collapses:
 * "log again" hands in a prefill and jumps straight to PAID?, so a
 * repeat sale is 2–3 taps.
 *
 * This screen never decides matching outcomes — it hands the finished
 * sale up through onDone and the parent runs the engine, because the
 * engine needs the ledger and the ledger lives up there.
 */

const labelClass = "mb-1 block text-xs font-medium text-neutral-500";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

/** Local calendar date — same rule as quick-add: toISOString would give
 *  tomorrow for an evening sale anywhere in the Americas. */
const today = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export type SalePrefill = {
  lineItems: LineItem[];
  clientName: string;
};

export type SaleResult = {
  sale: Sale;
  /** Set when the user asked to save an unknown client — parent persists
   *  the client FIRST so the sale's clientId always references a row. */
  newClient: Client | null;
  /** Set when the recurring toggle was on. */
  template: Omit<RecurringTemplate, "id"> | null;
};

type Step = "pick" | "checkout" | "paid" | "method";

export default function NewSale({
  services,
  clients,
  prefill,
  onDone,
  onClose,
}: {
  services: Service[];
  clients: Client[];
  /** "Log again": items + client pre-filled, jump straight to PAID?. */
  prefill?: SalePrefill;
  onDone: (result: SaleResult, paid: boolean, method: PaymentMethod | null) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(prefill ? "paid" : "pick");
  const [quantities, setQuantities] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const item of prefill?.lineItems ?? []) {
      if (item.serviceId) map.set(item.serviceId, item.quantity);
    }
    return map;
  });
  /**
   * Prefill lines are SNAPSHOTS of what was actually charged. Rebuilding
   * them from the current catalog silently re-priced a $75 job to catalog
   * price × 1 — wrong revenue written to the ledger and the tax CSV in two
   * taps. These overrides carry the historical unit price (and cost, and
   * name — the service may have been renamed or deleted) into the memo
   * below; the catalog only prices lines the user adds fresh.
   */
  const [prefillLines] = useState<Map<string, LineItem>>(() => {
    const map = new Map<string, LineItem>();
    for (const item of prefill?.lineItems ?? []) {
      if (item.serviceId) map.set(item.serviceId, item);
    }
    return map;
  });
  // Custom amount: a sale with no catalog product behind it. Kept as
  // dollars text until checkout so typing feels like the numpad.
  const [customAmount, setCustomAmount] = useState(() => {
    const custom = prefill?.lineItems.find((i) => i.serviceId === null);
    return custom ? (custom.unitCents / 100).toFixed(2) : "";
  });
  const [customLabel, setCustomLabel] = useState(
    () => prefill?.lineItems.find((i) => i.serviceId === null)?.name ?? "",
  );

  const [clientName, setClientName] = useState(prefill?.clientName ?? "");
  const [date, setDate] = useState(today);
  const [recurring, setRecurring] = useState(false);
  const [cadence, setCadence] = useState<Cadence>({ type: "weekly" });
  const [everyN, setEveryN] = useState("30");
  const [saveClient, setSaveClient] = useState(true);

  const lineItems = useMemo((): LineItem[] => {
    const items: LineItem[] = [];
    for (const [serviceId, qty] of quantities) {
      if (qty <= 0) continue;
      const snapshot = prefillLines.get(serviceId);
      if (snapshot) {
        // The historical price, at whatever quantity the user now says.
        items.push({ ...snapshot, quantity: qty });
        continue;
      }
      const service = services.find((svc) => svc.id === serviceId);
      if (service) items.push(lineFromService(service, qty));
      // No snapshot and no catalog entry: nothing to price it with — the
      // qty map can only contain such an id if the catalog changed mid-
      // sale, and a silently-invented price would be worse than dropping.
    }
    const customCents = dollarsToCents(customAmount);
    if (customCents > 0) {
      items.push({
        serviceId: null,
        name: customLabel.trim() || "Custom",
        quantity: 1,
        unitCents: customCents,
        unitCostCents: null,
      });
    }
    return items;
  }, [services, quantities, prefillLines, customAmount, customLabel]);

  const totalCents = saleTotalCents({ lineItems });
  const knownClient = findClientByName(clients, clientName);
  const unknownName = clientName.trim() !== "" && !knownClient;

  function step_(serviceId: string, delta: 1 | -1) {
    setQuantities((current) => {
      const next = new Map(current);
      next.set(serviceId, Math.max(0, (next.get(serviceId) ?? 0) + delta));
      return next;
    });
  }

  /** Assemble the SaleResult once; every terminal button routes through. */
  function finish(paid: boolean, method: PaymentMethod | null) {
    const trimmed = clientName.trim();
    const client =
      knownClient ??
      (trimmed && saveClient
        ? { id: crypto.randomUUID(), name: trimmed, notes: "" }
        : null);

    const sale: Sale = {
      id: crypto.randomUUID(),
      clientId: client?.id ?? null,
      lineItems,
      date,
      state: paid ? (method === "cash" ? "paid" : "expected") : "open",
      method: paid ? method : null,
      matchedTxnId: null,
      recurringTemplateId: null,
    };

    const template =
      recurring && client
        ? {
            clientId: client.id,
            lineItems: lineItems.map((i) => ({ ...i })),
            cadence:
              cadence.type === "everyN"
                ? {
                    type: "everyN" as const,
                    days: Math.max(1, Math.round(Number(everyN) || 30)),
                  }
                : cadence,
            // Anchored on THIS sale's date, due one cadence step LATER:
            // this sale itself covers the anchor date, and a nextDue of
            // today would generate a duplicate instance immediately.
            nextDue: advance(
              date,
              cadence.type === "everyN"
                ? { type: "everyN", days: Math.max(1, Math.round(Number(everyN) || 30)) }
                : cadence,
            ),
            active: true,
            consecutiveMisses: 0,
          }
        : null;

    onDone(
      { sale, newClient: knownClient ? null : client, template },
      paid,
      method,
    );
  }

  const header = (title: string) => (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold">{title}</h2>
      <button
        type="button"
        className="text-sm text-neutral-500 hover:underline"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );

  // ---- PAID? — one question, huge targets ----
  if (step === "paid") {
    return (
      <div className="space-y-6">
        {header("New sale")}
        <p className="text-center text-4xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </p>
        <p className="text-center text-sm text-neutral-500">
          {clientName.trim() || "No client"} ·{" "}
          {lineItems.map((i) => i.name).join(", ") || "no items"}
        </p>
        <h3 className="text-center text-lg font-semibold">Paid?</h3>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-6 text-lg font-semibold text-white hover:opacity-90"
            onClick={() => setStep("method")}
          >
            Yes
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-neutral-400 px-4 py-6 text-lg font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900"
            onClick={() => finish(false, null)}
          >
            No — owes me
          </button>
        </div>
        <button
          type="button"
          className="w-full text-sm text-neutral-500 hover:underline"
          onClick={() => setStep("checkout")}
        >
          Back to details
        </button>
      </div>
    );
  }

  // ---- CASH OR DIGITAL? ----
  if (step === "method") {
    return (
      <div className="space-y-6">
        {header("New sale")}
        <p className="text-center text-4xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </p>
        <h3 className="text-center text-lg font-semibold">Cash or digital?</h3>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-6 text-lg font-semibold text-white hover:opacity-90"
            onClick={() => finish(true, "cash")}
          >
            Cash
          </button>
          <button
            type="button"
            disabled={!clientName.trim()}
            className="flex-1 rounded-xl bg-foreground px-4 py-6 text-lg font-semibold text-background hover:opacity-90 disabled:opacity-40"
            onClick={() => finish(true, "digital")}
          >
            Digital
          </button>
        </div>
        {!clientName.trim() && (
          <p className="text-center text-sm text-neutral-500">
            Digital matching needs a client name — go back and add one, or
            take it as cash.
          </p>
        )}
        <button
          type="button"
          className="w-full text-sm text-neutral-500 hover:underline"
          onClick={() => setStep("paid")}
        >
          Back
        </button>
      </div>
    );
  }

  // ---- CHECKOUT ----
  if (step === "checkout") {
    return (
      <div className="space-y-4">
        {header("Checkout")}
        <p className="text-center text-4xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </p>

        <div>
          <label className={labelClass} htmlFor="sale-client">
            Who&apos;s it for?
          </label>
          <input
            id="sale-client"
            className={fieldClass}
            placeholder="Client name"
            list="known-clients"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <datalist id="known-clients">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          {unknownName && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveClient}
                onChange={(e) => setSaveClient(e.target.checked)}
              />
              Save “{clientName.trim()}” as a client
            </label>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="sale-date">
            Date
          </label>
          <input
            id="sale-date"
            type="date"
            className={fieldClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={recurring}
              disabled={!clientName.trim()}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Make recurring
            {!clientName.trim() && (
              <span className="font-normal text-neutral-500">
                (needs a client)
              </span>
            )}
          </label>
          {recurring && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { type: "weekly" },
                    { type: "biweekly" },
                    { type: "monthly" },
                    { type: "everyN", days: 30 },
                  ] as Cadence[]
                ).map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    aria-pressed={cadence.type === option.type}
                    className={`rounded-lg px-2 py-2 text-sm font-medium ${
                      cadence.type === option.type
                        ? "bg-foreground text-background"
                        : "border border-neutral-300 bg-white text-neutral-900"
                    }`}
                    onClick={() => setCadence(option)}
                  >
                    {option.type === "everyN"
                      ? "Every N days"
                      : cadenceLabel(option)}
                  </button>
                ))}
              </div>
              {cadence.type === "everyN" && (
                <div className="flex items-center gap-2 text-sm">
                  <label htmlFor="sale-everyn">Every</label>
                  <input
                    id="sale-everyn"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="365"
                    className={`${fieldClass} w-20 text-center`}
                    value={everyN}
                    onChange={(e) => setEveryN(e.target.value)}
                  />
                  <span>days, starting {date}</span>
                </div>
              )}
              <p className="text-xs text-neutral-500">
                When due, this adds an unpaid sale to Owed. No reminders, no
                notifications — it just expects the money.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90"
          onClick={() => setStep("paid")}
        >
          Continue
        </button>
        <button
          type="button"
          className="w-full text-sm text-neutral-500 hover:underline"
          onClick={() => setStep("pick")}
        >
          Back to products
        </button>
      </div>
    );
  }

  // ---- PICK PRODUCTS ----
  return (
    <div className="space-y-4">
      {header("New sale")}

      {services.length === 0 && (
        <p className="text-sm text-neutral-500">
          No products yet — use the custom amount below, or add products from
          the home screen first.
        </p>
      )}

      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.id} className="space-y-2">
            <ProductCard
              service={service}
              quantity={quantities.get(service.id) ?? 0}
              onStep={(delta) => step_(service.id, delta)}
            />
            {service.pricing.type === "rate" &&
              (quantities.get(service.id) ?? 0) > 0 && (
                <div className="flex items-center gap-2 px-2 text-sm">
                  <label htmlFor={`size-${service.id}`}>
                    How many {UNIT_LABELS[service.pricing.unit]}s?
                  </label>
                  <input
                    id={`size-${service.id}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    className={`${fieldClass} w-24 text-center`}
                    value={quantities.get(service.id) ?? 0}
                    onChange={(e) => {
                      const size = Number.parseFloat(e.target.value);
                      setQuantities((current) => {
                        const next = new Map(current);
                        next.set(
                          service.id,
                          Number.isFinite(size) && size > 0 ? size : 0,
                        );
                        return next;
                      });
                    }}
                  />
                </div>
              )}
          </div>
        ))}
        {[...prefillLines.values()]
          .filter((item) => !services.some((svc) => svc.id === item.serviceId))
          .map((item) => (
            // The service was deleted/renamed since this sale — the line
            // still shows and still charges its snapshot price.
            <div
              key={item.serviceId}
              className="rounded-xl border border-neutral-300 p-4 text-sm dark:border-neutral-700"
            >
              {item.name} · {formatCents(item.unitCents)} ·{" "}
              {quantities.get(item.serviceId!) ?? 0} — from the original sale
            </div>
          ))}
      </div>

      <div className="rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
        <p className="mb-2 text-sm font-semibold">Custom amount</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            aria-label="Custom amount in dollars"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={fieldClass}
            placeholder="0.00"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
          <input
            aria-label="What was it for"
            className={fieldClass}
            placeholder="What for? (optional)"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
        <span className="text-sm text-neutral-500">Total</span>
        <span className="text-2xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </span>
      </div>

      <button
        type="button"
        disabled={totalCents === 0}
        className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
        onClick={() => setStep("checkout")}
      >
        Checkout
      </button>
    </div>
  );
}
