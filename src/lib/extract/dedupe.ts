import type { Transaction } from "@/lib/transaction";

/**
 * Overlapping screenshots mean the same payment shows up twice. Fuzzy-match on
 * payer + amount + date and keep the copy the model was most sure about.
 */

/** "Maria  Santos" and "maria santos" are the same person. */
const normalizePayer = (payer: string): string =>
  payer.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Levenshtein distance, capped by early exit on very different lengths. */
const editDistance = (a: string, b: string): number => {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

/** OCR turns "rn" into "m" — one or two character slips still count as a match. */
const samePayer = (a: string, b: string): boolean => {
  const left = normalizePayer(a);
  const right = normalizePayer(b);
  if (left === right) return true;
  if (left === "" || right === "") return false;
  const allowed = Math.min(2, Math.floor(Math.max(left.length, right.length) / 4));
  return editDistance(left, right) <= allowed;
};

const meanConfidence = (tx: Transaction): number => {
  const values = Object.values(tx.confidence).filter(
    (value): value is number => typeof value === "number",
  );
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

/**
 * Exported so the client can screen a NEW batch against payments already on
 * the ledger — server-side dedupe only ever sees one request's files.
 * An empty date means "unreadable", not "a different day": the same payment
 * can appear once with its date and once without across two screenshots.
 */
export const isDuplicate = (a: Transaction, b: Transaction): boolean =>
  a.direction === b.direction &&
  a.amountCents === b.amountCents &&
  (a.date === b.date || a.date === "" || b.date === "") &&
  samePayer(a.payer, b.payer);

/**
 * Keeps the highest-confidence copy of each payment, in first-seen order.
 * Two genuinely separate payments of the same amount on the same day from the
 * same person will collapse into one — the user can re-add it manually. That's
 * the safer error: a missing row is visible, a silent double-count isn't.
 */
export const dedupe = (transactions: Transaction[]): Transaction[] => {
  const kept: Transaction[] = [];

  for (const tx of transactions) {
    const existing = kept.findIndex((other) => isDuplicate(other, tx));
    if (existing === -1) {
      kept.push(tx);
      continue;
    }
    const held = kept[existing];
    // A readable date beats any confidence score — it's the copy with data.
    const preferTx =
      tx.date !== "" && held.date === ""
        ? true
        : tx.date === "" && held.date !== ""
          ? false
          : meanConfidence(tx) > meanConfidence(held);
    if (preferTx) kept[existing] = tx;
  }
  return kept;
};
