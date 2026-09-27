/**
 * The desktop home's month-by-month money, pure so it is testable (the
 * rule: logic in src/lib, components only render). Business rows only;
 * IN also carries EXPECTED sales (paid digitally, waiting to match) —
 * the same "Business" figure RunningTotals shows — while a PAID sale
 * counts only through its one transaction and an OPEN sale (owed) never
 * blends in. Undated rows sit on no month. Kept may be negative.
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

/** Months 1..monthCount of `year`, index 0 = January. */
export function yearSeries(
  transactions: TxnLike[],
  sales: SaleLike[],
  year: number,
  monthCount: number,
): YearSeries {
  const inCents = Array.from({ length: monthCount }, () => 0);
  const outCents = Array.from({ length: monthCount }, () => 0);
  const prefix = `${year}-`;
  const month = (date: string) => Number(date.slice(5, 7)) - 1;
  for (const tx of transactions) {
    if (tx.business !== true || !tx.date || !tx.date.startsWith(prefix)) continue;
    const m = month(tx.date);
    if (!(m >= 0 && m < monthCount)) continue;
    if (tx.direction === "out") outCents[m] += tx.amountCents;
    else inCents[m] += tx.amountCents;
  }
  for (const sale of sales) {
    if (sale.state !== "expected" || !sale.date || !sale.date.startsWith(prefix)) continue;
    const m = month(sale.date);
    if (m >= 0 && m < monthCount) inCents[m] += saleCents(sale);
  }
  return { inCents, outCents, keptCents: inCents.map((v, i) => v - outCents[i]) };
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
