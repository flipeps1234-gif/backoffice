import { formatCents, type Transaction } from "./transaction";

/**
 * The payoff for uploading. Three facts, computed from what the user just
 * confirmed, that they probably couldn't have told you off the top of their
 * head. This runs the moment a batch is confirmed — before any sorting — so
 * it works over every payment read, business and personal alike.
 */

export type Insight = {
  key: "period" | "busiest" | "payer";
  label: string;
  value: string;
  detail: string;
};

const UNKNOWN = "Unknown";

/** "2026-07-14" → "Jul 14". Parsed as UTC so the day never shifts by timezone. */
const shortDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const periodInsight = (transactions: Transaction[]): Insight => {
  const total = transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
  const dates = transactions.map((tx) => tx.date).filter(Boolean).sort();

  const detail =
    dates.length === 0
      ? `${plural(transactions.length, "payment")}, no dates read`
      : dates[0] === dates.at(-1)
        ? `${plural(transactions.length, "payment")} on ${shortDate(dates[0])}`
        : `${plural(transactions.length, "payment")}, ${shortDate(dates[0])} – ${shortDate(dates.at(-1)!)}`;

  return { key: "period", label: "Total read", value: formatCents(total), detail };
};

const busiestInsight = (transactions: Transaction[]): Insight => {
  const byDay = new Map<string, { count: number; cents: number }>();

  for (const tx of transactions) {
    if (!tx.date) continue;
    const day = byDay.get(tx.date) ?? { count: 0, cents: 0 };
    day.count += 1;
    day.cents += tx.amountCents;
    byDay.set(tx.date, day);
  }

  if (byDay.size === 0) {
    return {
      key: "busiest",
      label: "Busiest day",
      value: "—",
      detail: "No dates were readable in these screenshots",
    };
  }

  // Most payments wins; ties break on money, then on the earlier date, so the
  // same input always produces the same answer.
  const [date, day] = [...byDay.entries()].sort(
    (a, b) =>
      b[1].count - a[1].count || b[1].cents - a[1].cents || a[0].localeCompare(b[0]),
  )[0];

  // With one payment per day, "busiest" is noise — every day ties. The
  // tie-break already picked the highest-earning day, so say that instead.
  const single = day.count === 1;

  return {
    key: "busiest",
    label: single ? "Best day" : "Busiest day",
    value: shortDate(date),
    detail: single
      ? formatCents(day.cents)
      : `${plural(day.count, "payment")}, ${formatCents(day.cents)}`,
  };
};

const topPayerInsight = (transactions: Transaction[]): Insight => {
  const byPayer = new Map<string, { count: number; cents: number; name: string }>();

  for (const tx of transactions) {
    const name = tx.payer.trim() || UNKNOWN;
    const key = name.toLowerCase();
    const entry = byPayer.get(key) ?? { count: 0, cents: 0, name };
    entry.count += 1;
    entry.cents += tx.amountCents;
    byPayer.set(key, entry);
  }

  if (byPayer.size === 0) {
    return {
      key: "payer",
      label: "Top payer",
      value: "—",
      detail: "No payments yet",
    };
  }

  const top = [...byPayer.values()].sort(
    (a, b) => b.cents - a.cents || b.count - a.count || a.name.localeCompare(b.name),
  )[0];

  return {
    key: "payer",
    label: "Top payer",
    value: top.name,
    detail: `${formatCents(top.cents)} across ${plural(top.count, "payment")}`,
  };
};

export const buildInsights = (transactions: Transaction[]): Insight[] => {
  if (transactions.length === 0) return [];
  return [
    periodInsight(transactions),
    busiestInsight(transactions),
    topPayerInsight(transactions),
  ];
};
