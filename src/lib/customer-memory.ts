import type { Transaction } from "./transaction";

/**
 * Per-customer memory, derived — not stored. The payer names already on the
 * ledger ARE the customers; what Rosa usually pays for lawn mowing is just
 * her most recent lawn-mowing row. No customers table until one is needed.
 */

const norm = (name: string): string => name.trim().toLowerCase();

export type Remembered = {
  amountCents: number;
  quantity: number | null;
};

/**
 * What this payer paid the last time they bought this service.
 * Most recent by date; same-date ties break by array position, which is
 * newest-first BY INVARIANT — database loads order that way and both
 * in-session save paths prepend. The stable sort preserves it on ties, so
 * logging a same-day correction makes the correction the new "usual".
 */
export const rememberedFor = (
  transactions: Transaction[],
  payer: string,
  serviceId: string,
): Remembered | undefined => {
  const who = norm(payer);
  if (!who) return undefined;

  const past = transactions
    .filter(
      (tx) =>
        tx.direction === "in" &&
        // A personal favor logged against the chip is not a business price.
        tx.business !== false &&
        tx.serviceId === serviceId &&
        norm(tx.payer) === who &&
        tx.amountCents > 0,
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const last = past[0];
  if (!last) return undefined;
  return { amountCents: last.amountCents, quantity: last.quantity };
};

/**
 * Names for the payer field's autocomplete — matching only works when the
 * name is spelled the same way twice. Business income only, deduped
 * case-insensitively, most recent first, capped so the list stays a list.
 */
export const knownPayers = (transactions: Transaction[]): string[] => {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const tx of transactions) {
    if (tx.direction !== "in" || tx.business === false) continue;
    const name = tx.payer.trim();
    if (!name) continue;
    const key = norm(name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= 50) break;
  }
  return names;
};
