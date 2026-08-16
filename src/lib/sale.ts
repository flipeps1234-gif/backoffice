import type { Service } from "./service";

/**
 * A sale: what was sold, to whom, and whether the money has arrived.
 * See FLOW.md — this module encodes that chart's states and nothing more.
 *
 * The three states, and the one-way doors between them:
 *   OPEN     — logged, not paid. Lives on the Owed tab.
 *   EXPECTED — the owner says it was paid digitally, but no ingested
 *              transaction has been matched yet. Rescanned every batch.
 *   PAID     — money confirmed: cash marked by hand, or matched to an
 *              ingested transaction (matchedTxnId set).
 *
 * Money is integer cents everywhere, as in the rest of the codebase.
 */

export type SaleState = "open" | "expected" | "paid";
export type PaymentMethod = "cash" | "digital";

/**
 * A line item SNAPSHOTS the service at sale time: name, unit price and unit
 * cost are copied, not referenced. Editing the catalog next month must not
 * quietly rewrite last month's sales — a ledger is a record of what
 * happened, and what happened includes the price it happened at.
 * serviceId survives purely as provenance (revenue-by-service grouping).
 */
export type LineItem = {
  /** null = a custom amount with no catalog product behind it. */
  serviceId: string | null;
  name: string;
  /** Fractional allowed for rate services (2.5 hours); 1 for custom. */
  quantity: number;
  unitCents: number;
  /** Per-unit cost snapshot for margin. null = owner never set one. */
  unitCostCents: number | null;
};

export type Sale = {
  id: string;
  clientId: string | null;
  lineItems: LineItem[];
  /** YYYY-MM-DD. Unlike ingested rows this is always known — it's typed. */
  date: string;
  state: SaleState;
  /** How it was (or will be) paid. null while OPEN and undecided. */
  method: PaymentMethod | null;
  /** The ingested transaction this sale was matched to. PAID+digital only. */
  matchedTxnId: string | null;
  /** Set when this sale was auto-created from a recurring template. */
  recurringTemplateId: string | null;
  /** Proof-of-work, v0.6. Free text; "" = none. */
  notes: string;
  /** Compressed JPEG data URL (~≤300KB, src/app/photo.ts), or null.
   *  Stored IN the row on purpose — the sale's RLS protects its photo. */
  photo: string | null;
};

/** Rounded per line, not per batch — same rule as priceFor in service.ts. */
export const lineTotalCents = (item: LineItem): number =>
  Math.round(item.unitCents * item.quantity);

export const saleTotalCents = (sale: Pick<Sale, "lineItems">): number =>
  sale.lineItems.reduce((sum, item) => sum + lineTotalCents(item), 0);

/** Margin is an ESTIMATE (cost snapshots), never tax data. null-cost lines
 *  contribute unknown, so the whole sale's margin is null if any line is. */
export const saleMarginCents = (
  sale: Pick<Sale, "lineItems">,
): number | null => {
  let margin = 0;
  for (const item of sale.lineItems) {
    if (item.unitCostCents === null) return null;
    margin +=
      lineTotalCents(item) - Math.round(item.unitCostCents * item.quantity);
  }
  return margin;
};

/**
 * Service provenance the sale's payment row carries — the dashboard's
 * revenue/margin-by-service and the tax CSV's service column all read the
 * TRANSACTION stream, so whatever links a payment to a sale (cash mirror or
 * the matching engine) must stamp this on the transaction or the job lands
 * under "No service". Only when it means something: one line, a real
 * service, and a quantity that isn't just "1 of a total".
 */
export const saleProvenance = (
  sale: Pick<Sale, "lineItems">,
): { serviceId: string | null; quantity: number | null } => {
  const only = sale.lineItems.length === 1 ? sale.lineItems[0] : null;
  return {
    serviceId: only ? only.serviceId : null,
    quantity:
      only && only.serviceId && only.quantity !== 1 ? only.quantity : null,
  };
};

/** Build a line item from a catalog service, snapshotting price and cost. */
export const lineFromService = (
  service: Service,
  quantity: number,
): LineItem => ({
  serviceId: service.id,
  name: service.name,
  quantity,
  unitCents: service.pricing.cents,
  unitCostCents: service.costCents,
});

/**
 * How the received/owed split is computed — the "show both" decision.
 * EXPECTED counts as received: the owner asserted it was paid, and the
 * matching engine's job is to corroborate, not to doubt them on screen.
 * If it later resolves "actually unpaid", the figure corrects itself.
 */
export const receivedCents = (sales: Sale[]): number =>
  sales
    .filter((s) => s.state === "paid" || s.state === "expected")
    .reduce((sum, s) => sum + saleTotalCents(s), 0);

export const owedCents = (sales: Sale[]): number =>
  sales
    .filter((s) => s.state === "open")
    .reduce((sum, s) => sum + saleTotalCents(s), 0);

/** Days from the sale's date to `today`, for age flags. Both YYYY-MM-DD. */
export const saleAgeDays = (sale: Pick<Sale, "date">, today: string): number =>
  Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${sale.date}T00:00:00Z`)) /
      86_400_000,
  );

/** OPEN this long gets a gentle age flag on the Owed tab. */
export const OWED_FLAG_DAYS = 14;
/** EXPECTED this long unmatched triggers the resolve sheet. */
export const EXPECTED_FLAG_DAYS = 14;

/**
 * Schema validation for line items arriving from Postgres jsonb (or anywhere
 * else). Same posture as extract/validate.ts: never throw, drop what doesn't
 * parse, and money must be a whole number of cents in range.
 */
export const MAX_CENTS = 99_999_999;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asCents = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_CENTS
    ? v
    : null;

export const validateLineItems = (raw: unknown): LineItem[] => {
  if (!Array.isArray(raw)) return [];
  const items: LineItem[] = [];
  for (const entry of raw) {
    if (!isObject(entry)) continue;
    const unitCents = asCents(entry.unitCents);
    if (unitCents === null) continue;
    const quantity =
      typeof entry.quantity === "number" &&
      Number.isFinite(entry.quantity) &&
      entry.quantity > 0
        ? entry.quantity
        : null;
    if (quantity === null) continue;
    const unitCostCents =
      entry.unitCostCents === null ? null : asCents(entry.unitCostCents);
    items.push({
      serviceId: typeof entry.serviceId === "string" ? entry.serviceId : null,
      name: typeof entry.name === "string" ? entry.name.trim() : "",
      quantity,
      unitCents,
      // A malformed cost becomes "unknown", not a dropped sale — the money
      // the client paid is data, the margin estimate is decoration.
      unitCostCents: unitCostCents,
    });
  }
  return items;
};
