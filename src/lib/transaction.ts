/** One payment. Money is always integer cents. */

export type TransactionSource = "screenshot" | "manual";

/** Money in (a payment received) or money out (an expense). */
export type TransactionDirection = "in" | "out";

/** Which fields the extractor was unsure about. Shown as "tap to fix" flags. */
export type FieldName = "payer" | "amountCents" | "date";

export type Transaction = {
  id: string;
  payer: string;
  amountCents: number;
  /** ISO date, YYYY-MM-DD. Empty string means the extractor couldn't find one. */
  date: string;
  memo: string;
  source: TransactionSource;
  direction: TransactionDirection;
  /** Which catalog service this was, if logged via a chip. */
  serviceId: string | null;
  /** Units for rate-priced jobs (sqft / hours / rooms). null when flat. */
  quantity: number | null;
  /** null until the user swipes. true = business, false = personal. */
  business: boolean | null;
  /** 0..1 per field. Anything below LOW_CONFIDENCE gets flagged in the sheet. */
  confidence: Partial<Record<FieldName, number>>;
};

export const LOW_CONFIDENCE = 0.8;

export const isUncertain = (tx: Transaction, field: FieldName): boolean =>
  (tx.confidence[field] ?? 1) < LOW_CONFIDENCE;

export const uncertainFields = (tx: Transaction): FieldName[] =>
  (["payer", "amountCents", "date"] as const).filter((f) => isUncertain(tx, f));

export const formatCents = (cents: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

/** $999,999.99 — a typo guard, and safely inside Postgres int4. */
export const MAX_CENTS = 99_999_999;

/**
 * "12.34" -> 1234. Anything unparseable is 0 cents. Clamped to 0..MAX_CENTS:
 * amounts in this app are never negative, and never bigger than the column.
 */
export const dollarsToCents = (input: string): number => {
  const amount = Number.parseFloat(input.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return Math.min(MAX_CENTS, Math.max(0, Math.round(amount * 100)));
};

export const centsToDollars = (cents: number): string =>
  (cents / 100).toFixed(2);

export const totalCents = (transactions: Transaction[]): number =>
  transactions.reduce((sum, tx) => sum + tx.amountCents, 0);

/** In and out never blend into one number — they answer different questions. */
export const totalsByDirection = (
  transactions: Transaction[],
): { inCents: number; outCents: number } => {
  let inCents = 0;
  let outCents = 0;
  for (const tx of transactions) {
    if (tx.direction === "out") outCents += tx.amountCents;
    else inCents += tx.amountCents;
  }
  return { inCents, outCents };
};
