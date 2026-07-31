import type { Transaction } from "./transaction";

/** History is the triaged ledger, newest day first. */

export type DayGroup = {
  /** "" for undated rows — always the last group. */
  date: string;
  label: string;
  transactions: Transaction[];
};

/** "2026-07-31" relative to today: "Today", "Yesterday", "Tuesday, Jul 29". */
export const dayLabel = (date: string, today: string): string => {
  if (date === "") return "No date";
  if (date === today) return "Today";

  const parsed = new Date(`${date}T00:00:00Z`);
  const todayParsed = new Date(`${today}T00:00:00Z`);
  const daysAgo = Math.round(
    (todayParsed.getTime() - parsed.getTime()) / 86_400_000,
  );
  if (daysAgo === 1) return "Yesterday";

  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    // Same year is implied; a different year is worth saying.
    year:
      date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "UTC",
  });
};

/**
 * Triaged rows only — anything still business:null is mid-flow and lives in
 * the confirm/sort screens, not the record. Days sort newest first; undated
 * rows gather at the end.
 */
export const groupByDay = (
  transactions: Transaction[],
  today: string,
): DayGroup[] => {
  const triaged = transactions.filter((tx) => tx.business !== null);

  const byDate = new Map<string, Transaction[]>();
  for (const tx of triaged) {
    const rows = byDate.get(tx.date) ?? [];
    rows.push(tx);
    byDate.set(tx.date, rows);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => {
      if (a === "") return 1;
      if (b === "") return -1;
      return b.localeCompare(a);
    })
    .map(([date, rows]) => ({
      date,
      label: dayLabel(date, today),
      transactions: rows,
    }));
};
