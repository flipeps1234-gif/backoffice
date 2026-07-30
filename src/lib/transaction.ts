/** One payment. Money is always integer cents. */

export type TransactionSource = "screenshot" | "manual";

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

/** "12.34" -> 1234. Anything unparseable is 0 cents. */
export const dollarsToCents = (input: string): number => {
  const amount = Number.parseFloat(input.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

export const centsToDollars = (cents: number): string =>
  (cents / 100).toFixed(2);

export const totalCents = (transactions: Transaction[]): number =>
  transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
