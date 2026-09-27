/**
 * The desktop home's month-by-month money, pure so it is testable (the
 * rule: logic in src/lib, components only render). Business transactions
 * only — the actuals basis every report uses; EXPECTED sales are summed
 * apart, OPEN sales (owed) never blend in. Undated rows sit on no month.
 * Kept may be negative.
 *
 * Types are structural on purpose (no imports), so the unit test can load
 * this file on its own.
 */

type TxnLike = {
  business: boolean | null;
  date: string | null;
  direction?: "in" | "out";
  amountCents: number;
};
type LineLike = { quantity: number; unitCents: number };
type SaleLike = { state: string; date: string; lineItems: LineLike[] };

export type YearSeries = { inCents: number[]; outCents: number[]; keptCents: number[] };

const saleCents = (sale: SaleLike): number =>
  sale.lineItems.reduce((sum, line) => sum + Math.round(line.quantity * line.unitCents), 0);

const monthOf = (date: string) => Number(date.slice(5, 7)) - 1;

/** Months 1..monthCount of `year`, index 0 = January — business
 *  TRANSACTIONS only, the same basis as the Reports card below it
 *  (byMonth), the tax CSV and proof of income, so one screen never shows
 *  two figures for "money in, September". Sales paid digitally but not
 *  matched yet are reported apart (expectedCentsIn), never blended. */
export function yearSeries(transactions: TxnLike[], year: number, monthCount: number): YearSeries {
  const inCents = Array.from({ length: monthCount }, () => 0);
  const outCents = Array.from({ length: monthCount }, () => 0);
  const prefix = `${year}-`;
  for (const tx of transactions) {
    if (tx.business !== true || !tx.date || !tx.date.startsWith(prefix)) continue;
    const m = monthOf(tx.date);
    if (!(m >= 0 && m < monthCount)) continue;
    if (tx.direction === "out") outCents[m] += tx.amountCents;
    else inCents[m] += tx.amountCents;
  }
  return { inCents, outCents, keptCents: inCents.map((v, i) => v - outCents[i]) };
}

/** How many months the chart shows: all twelve for a past year; for this
 *  year, through today's month — or later, when rows are dated ahead
 *  (a cash sale checked out for next week), so nothing counted elsewhere
 *  silently falls off the chart. */
export function seriesMonths(
  transactions: TxnLike[],
  year: number,
  thisYear: number,
  thisMonth: number,
): number {
  if (year !== thisYear) return 12;
  let last = thisMonth;
  for (const tx of transactions) {
    if (tx.business !== true || !tx.date || !tx.date.startsWith(`${year}-`)) continue;
    const m = monthOf(tx.date) + 1;
    if (m > last && m <= 12) last = m;
  }
  return last;
}

/** Money from sales marked paid digitally that no payment has matched
 *  yet (EXPECTED), dated in `year` — shown beside the totals, not in them. */
export function expectedCentsIn(sales: SaleLike[], year: number): number {
  let total = 0;
  for (const sale of sales) {
    if (sale.state === "expected" && sale.date && sale.date.startsWith(`${year}-`)) total += saleCents(sale);
  }
  return total;
}

/** Years with any dated row, plus this year; newest first, at most four,
 *  never a future year (a typo'd 2062 must not become a tab). */
export function yearsWithData(
  transactions: { date: string | null }[],
  sales: { date: string }[],
  thisYear: number,
): number[] {
  const years = new Set<number>([thisYear]);
  for (const row of [...transactions, ...sales]) {
    const y = row.date ? Number(row.date.slice(0, 4)) : NaN;
    if (Number.isInteger(y) && y >= 2000 && y <= thisYear) years.add(y);
  }
  return [...years].sort((a, b) => b - a).slice(0, 4);
}
