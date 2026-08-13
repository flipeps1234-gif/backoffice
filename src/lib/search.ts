import type { Client } from "./client";
import { saleTotalCents, type Sale } from "./sale";
import type { Transaction } from "./transaction";

/**
 * Global search — v0.6. One query across clients, sales and transactions,
 * because the owner remembers "Rosa" or "120" or "lawn", not which screen
 * a thing lives on.
 *
 * Diacritic-folded on both sides: this app's users type "jose" one-handed
 * in a driveway and expect to find "José". Matching is every-token-must-
 * appear (AND), substring, case- and accent-blind. No fuzzy distance here —
 * search is a lookup, not the matching engine; a wrong hit in search wastes
 * a tap, so precision beats recall.
 */

export const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const tokens = (query: string): string[] =>
  fold(query).split(/\s+/).filter(Boolean);

/** "12000 cents" → searchable as both "120" and "120.00". */
const moneyHaystack = (cents: number): string =>
  `${(cents / 100).toFixed(2)} ${Math.trunc(cents / 100)}`;

const matches = (haystack: string, queryTokens: string[]): boolean =>
  queryTokens.every((token) => haystack.includes(token));

export type SearchResults = {
  clients: Client[];
  sales: Sale[];
  transactions: Transaction[];
};

export const EMPTY_RESULTS: SearchResults = {
  clients: [],
  sales: [],
  transactions: [],
};

/** Per-group cap — search answers "where is it", not "show me everything". */
export const SEARCH_GROUP_LIMIT = 8;

export const searchAll = (
  query: string,
  data: {
    clients: Client[];
    sales: Sale[];
    transactions: Transaction[];
  },
): SearchResults => {
  const q = tokens(query);
  if (q.length === 0) return EMPTY_RESULTS;

  const clientName = (id: string | null): string =>
    id ? (data.clients.find((c) => c.id === id)?.name ?? "") : "";

  const clients = data.clients
    .filter((c) => matches(fold(`${c.name} ${c.notes}`), q))
    .slice(0, SEARCH_GROUP_LIMIT);

  // Newest first: the sale being hunted for is almost always recent.
  const sales = [...data.sales]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((s) =>
      matches(
        fold(
          `${s.lineItems.map((i) => i.name).join(" ")} ${clientName(s.clientId)} ${s.date} ${moneyHaystack(saleTotalCents(s))}`,
        ),
        q,
      ),
    )
    .slice(0, SEARCH_GROUP_LIMIT);

  const transactions = [...data.transactions]
    .sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1))
    .filter((tx) =>
      matches(
        fold(`${tx.payer} ${tx.memo} ${tx.date} ${moneyHaystack(tx.amountCents)}`),
        q,
      ),
    )
    .slice(0, SEARCH_GROUP_LIMIT);

  return { clients, sales, transactions };
};
