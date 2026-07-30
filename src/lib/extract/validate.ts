import type { Transaction } from "@/lib/transaction";
import type { ExtractionResult, ExtractionWarningCode } from "./types";

/**
 * Hand-written schema validation. A model can return anything; nothing reaches
 * the sheet until it has been through here. No dependency — the shape is small
 * enough that a library would be more code than this.
 */

const WARNING_CODES: ExtractionWarningCode[] = [
  "no_amounts_visible",
  "not_a_payment_feed",
  "unreadable",
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

/** Cents must be a whole number. A model returning 12.5 is a bug, not a price. */
const asCents = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  return value;
};

const asConfidence = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
};

/** YYYY-MM-DD, and a real calendar date. "2026-02-31" is rejected. */
const asIsoDate = (value: unknown): string => {
  const text = asString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10) === text ? text : "";
};

const validateTransaction = (
  raw: unknown,
  index: number,
): Transaction | null => {
  if (!isObject(raw)) return null;

  const amountCents = asCents(raw.amountCents);
  if (amountCents === null) return null;

  const rawConfidence = isObject(raw.confidence) ? raw.confidence : {};

  return {
    id: `tx-${index}-${asString(raw.payer)}-${amountCents}`,
    payer: asString(raw.payer),
    amountCents,
    date: asIsoDate(raw.date),
    memo: asString(raw.memo),
    source: "screenshot",
    business: null,
    confidence: {
      payer: asConfidence(rawConfidence.payer),
      amountCents: asConfidence(rawConfidence.amountCents),
      date: asConfidence(rawConfidence.date),
    },
  };
};

/**
 * Never throws. Malformed rows are dropped rather than crashing the sheet —
 * the user still gets the rows that did parse.
 */
export const validateExtraction = (raw: unknown): ExtractionResult => {
  if (!isObject(raw)) return { transactions: [], warnings: [] };

  const rawTransactions = Array.isArray(raw.transactions) ? raw.transactions : [];
  const transactions = rawTransactions
    .map((row, index) => validateTransaction(row, index))
    .filter((tx): tx is Transaction => tx !== null);

  const rawWarnings = Array.isArray(raw.warnings) ? raw.warnings : [];
  const warnings = rawWarnings.flatMap((entry) => {
    if (!isObject(entry)) return [];
    const code = asString(entry.code) as ExtractionWarningCode;
    if (!WARNING_CODES.includes(code)) return [];
    return [{ code, filename: asString(entry.filename) || undefined }];
  });

  return { transactions, warnings };
};
