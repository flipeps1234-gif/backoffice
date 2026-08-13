import type { Transaction } from "./transaction";

/**
 * The payoff for uploading. Three facts, computed from what the user just
 * confirmed, that they probably couldn't have told you off the top of their
 * head. This runs the moment a batch is confirmed — before any sorting — so
 * it works over every payment read, business and personal alike.
 *
 * Since v0.6 this returns STRUCTURED facts, not English sentences — the
 * component owns the words (trilingual), the lib owns the arithmetic.
 * Composing prose here was how English leaked into ES/PT screens.
 */

export type Insight =
  | {
      key: "period";
      totalCents: number;
      payments: number;
      expenses: number;
      spentCents: number;
      /** null = no dates were readable. first === last = a single day. */
      firstDate: string | null;
      lastDate: string | null;
    }
  | {
      key: "busiest";
      /** best = every day tied at one payment, so show the top-earning day. */
      kind: "noIncome" | "noDates" | "best" | "busiest";
      date: string | null;
      count: number;
      cents: number;
    }
  | {
      key: "payer";
      kind: "noIncome" | "noNames" | "top";
      name: string | null;
      count: number;
      cents: number;
    };

const periodInsight = (transactions: Transaction[]): Insight => {
  const ins = transactions.filter((tx) => tx.direction !== "out");
  const outs = transactions.filter((tx) => tx.direction === "out");
  const dates = transactions.map((tx) => tx.date).filter(Boolean).sort();

  return {
    key: "period",
    totalCents: ins.reduce((sum, tx) => sum + tx.amountCents, 0),
    payments: ins.length,
    expenses: outs.length,
    spentCents: outs.reduce((sum, tx) => sum + tx.amountCents, 0),
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  };
};

const busiestInsight = (transactions: Transaction[]): Insight => {
  const byDay = new Map<string, { count: number; cents: number }>();

  // Busiest is about earning days — expenses don't make a day "busy".
  for (const tx of transactions) {
    if (!tx.date || tx.direction === "out") continue;
    const day = byDay.get(tx.date) ?? { count: 0, cents: 0 };
    day.count += 1;
    day.cents += tx.amountCents;
    byDay.set(tx.date, day);
  }

  if (byDay.size === 0) {
    // Don't claim dates were unreadable when the batch was simply all
    // expenses — those may carry perfectly good dates.
    const hadExpenses = transactions.some((tx) => tx.direction === "out");
    return {
      key: "busiest",
      kind: hadExpenses ? "noIncome" : "noDates",
      date: null,
      count: 0,
      cents: 0,
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
  return {
    key: "busiest",
    kind: day.count === 1 ? "best" : "busiest",
    date,
    count: day.count,
    cents: day.cents,
  };
};

const topPayerInsight = (transactions: Transaction[]): Insight => {
  const byPayer = new Map<string, { count: number; cents: number; name: string }>();

  for (const tx of transactions) {
    // Payers pay you — merchants you paid don't compete for Top payer.
    if (tx.direction === "out") continue;
    // Nameless payments are distinct people, not one big spender — folding
    // them into an "Unknown" bucket could crown a person who doesn't exist.
    const name = tx.payer.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = byPayer.get(key) ?? { count: 0, cents: 0, name };
    entry.count += 1;
    entry.cents += tx.amountCents;
    byPayer.set(key, entry);
  }

  if (byPayer.size === 0) {
    const hadExpenses = transactions.some((tx) => tx.direction === "out");
    const hadIncome = transactions.some((tx) => tx.direction !== "out");
    return {
      key: "payer",
      kind: !hadIncome && hadExpenses ? "noIncome" : "noNames",
      name: null,
      count: 0,
      cents: 0,
    };
  }

  const top = [...byPayer.values()].sort(
    (a, b) => b.cents - a.cents || b.count - a.count || a.name.localeCompare(b.name),
  )[0];

  return { key: "payer", kind: "top", name: top.name, count: top.count, cents: top.cents };
};

export const buildInsights = (transactions: Transaction[]): Insight[] => {
  if (transactions.length === 0) return [];
  return [
    periodInsight(transactions),
    busiestInsight(transactions),
    topPayerInsight(transactions),
  ];
};
