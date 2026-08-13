import type { Transaction } from "./transaction";

/**
 * Quarterly set-aside nudge — v0.6.5. INFORMATIONAL ONLY, the boundary is
 * explicit: no tax engine, no rates by state, no filing logic. The nudge
 * shows this quarter's business income and what a common 25% set-aside of
 * it would be, labeled as general information. 25% because it is the
 * middle of the "20–30%" range every small-business guide repeats — not
 * because we computed anything about THIS business.
 */

export const quarterOf = (
  iso: string,
): { year: number; quarter: 1 | 2 | 3 | 4; startMonth: string; endMonth: string } => {
  const year = Number.parseInt(iso.slice(0, 4), 10);
  const month = Number.parseInt(iso.slice(5, 7), 10);
  const quarter = (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  const first = (quarter - 1) * 3 + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    year,
    quarter,
    startMonth: `${year}-${pad(first)}`,
    endMonth: `${year}-${pad(first + 2)}`,
  };
};

/**
 * Business money-in inside today's quarter, from the SAME one-stream
 * transaction list the dashboard reads — cash sales are in it as mirror
 * transactions and matched digital payments are in it as their ingested
 * rows, so nothing is missed and nothing is double-counted.
 */
export const quarterIncomeCents = (
  transactions: Pick<
    Transaction,
    "date" | "amountCents" | "direction" | "business"
  >[],
  today: string,
): number => {
  const { startMonth, endMonth } = quarterOf(today);
  let cents = 0;
  for (const tx of transactions) {
    if (tx.business !== true || tx.direction === "out" || !tx.date) continue;
    const month = tx.date.slice(0, 7);
    if (month >= startMonth && month <= endMonth) cents += tx.amountCents;
  }
  return cents;
};

/** Exactly 25% in integer math: cents / 4, rounded. */
export const setAsideCents = (incomeCents: number): number =>
  Math.round(incomeCents / 4);
