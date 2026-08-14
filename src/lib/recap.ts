import type { Transaction } from "./transaction";

/**
 * The monthly recap notice — v0.6.7. NOT a notification: no push, no
 * scheduler, no server clock. On the first open in a new month, the
 * home screen shows last month's numbers once. The settings toggle
 * gates it; a marker remembers it was shown.
 */

export type Recap = {
  /** "2026-07" */
  month: string;
  inCents: number;
  outCents: number;
};

/** "2026-08-14" → "2026-07". */
export const previousMonth = (today: string): string => {
  const year = Number.parseInt(today.slice(0, 4), 10);
  const month = Number.parseInt(today.slice(5, 7), 10);
  const prevYear = month === 1 ? year - 1 : year;
  const prev = month === 1 ? 12 : month - 1;
  return `${prevYear}-${String(prev).padStart(2, "0")}`;
};

/**
 * Null = nothing to show: already shown, or last month had no business
 * activity (a recap of zeros teaches nothing and trains dismissal).
 */
export const dueRecap = (
  transactions: Transaction[],
  today: string,
  shownFor: string | null,
): Recap | null => {
  const month = previousMonth(today);
  if (shownFor === month) return null;

  let inCents = 0;
  let outCents = 0;
  let any = false;
  for (const tx of transactions) {
    if (tx.business !== true || !tx.date.startsWith(month)) continue;
    any = true;
    if (tx.direction === "out") outCents += tx.amountCents;
    else inCents += tx.amountCents;
  }
  return any ? { month, inCents, outCents } : null;
};

/** Jan 1 – Apr 15, the US filing window. Pure date math, no tax logic. */
export const inTaxSeason = (today: string): boolean => {
  const month = today.slice(5, 7);
  return (
    month === "01" ||
    month === "02" ||
    month === "03" ||
    (month === "04" && today.slice(8, 10) <= "15")
  );
};
