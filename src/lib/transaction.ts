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
  /**
   * The sale this payment was matched to, or null. Set by the matching
   * engine (or an undo). A matched transaction is counted through its sale
   * — "one payment, one sale" — so totals must skip it. See FLOW.md.
   */
  matchedSaleId: string | null;
  /** Schedule-C-grade label on EXPENSE rows (src/lib/category.ts), or
   *  null. A label for the tax CSV, never tax logic. Meaningless on
   *  income rows and left null there. */
  category: string | null;
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
 * "12.34" → 1234, and since v0.6 also "12,34" → 1234 — the person typing
 * may think in en-US, es or pt-BR, and a Brazilian typing 1.234,56 must
 * not be charged $1.23. The rules, in order:
 *
 * - Both "." and "," present: whichever comes LAST is the decimal
 *   separator, the other is grouping ("1.234,56" and "1,234.56" both
 *   → 123456).
 * - One separator, appearing once, with 1–2 digits after it: decimal
 *   ("12,5" → 1250, "0.5" → 50).
 * - Anything else is grouping ("1,234" → 123400, "1.234.567" →
 *   123456700): three digits after one separator is how every locale
 *   writes thousands, and money is never written with 3 decimals.
 *
 * Anything unparseable is 0 cents. Clamped to 0..MAX_CENTS: amounts in
 * this app are never negative, and never bigger than the column.
 */
export const dollarsToCents = (input: string): number => {
  const cleaned = input.replace(/[^0-9.,]/g, "");
  if (cleaned === "") return 0;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const sepIndex = Math.max(lastDot, lastComma);

  let wholeDigits = cleaned;
  let fraction = "";
  if (lastDot !== -1 && lastComma !== -1) {
    wholeDigits = cleaned.slice(0, sepIndex);
    fraction = cleaned.slice(sepIndex + 1);
  } else if (sepIndex !== -1) {
    const sepChar = cleaned[sepIndex];
    const appearsOnce = cleaned.indexOf(sepChar) === sepIndex;
    const after = cleaned.slice(sepIndex + 1);
    const before = cleaned.slice(0, sepIndex).replace(/[^0-9]/g, "");
    // A zero (or empty) integer part can never be thousands grouping —
    // nobody writes "0,125" to mean 125. It IS how per-unit rates are
    // written ("0.125" per sq ft), which the review caught parsing as
    // $125.00 — a 1000× price corruption written to the catalog.
    const zeroWhole = before === "" || /^0+$/.test(before);
    if (appearsOnce && after.length >= 1 && (zeroWhole || after.length <= 2)) {
      wholeDigits = cleaned.slice(0, sepIndex);
      fraction = after;
    }
  }

  const whole = Number.parseInt(wholeDigits.replace(/[^0-9]/g, "") || "0", 10);
  const fracDigits = fraction.replace(/[^0-9]/g, "");
  // "5" after the separator means 50 cents, not 5; three or more
  // fraction digits round to whole cents ("0.125" → 13, "0.999" → 100).
  const cents =
    fracDigits.length === 0
      ? 0
      : fracDigits.length === 1
        ? Number.parseInt(fracDigits, 10) * 10
        : fracDigits.length === 2
          ? Number.parseInt(fracDigits, 10)
          : Math.round(Number.parseInt(fracDigits.slice(0, 3), 10) / 10);

  if (!Number.isFinite(whole)) return MAX_CENTS;
  return Math.min(MAX_CENTS, Math.max(0, whole * 100 + cents));
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
