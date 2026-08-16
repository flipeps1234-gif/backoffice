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

/**
 * Money the way the OWNER writes it must find money the way the INDEX
 * stores it ("1234.56" / "1234"). Strip a leading $, drop en-US
 * thousands grouping, and read a comma decimal ("120,50") as a dot —
 * the app itself DISPLAYS "$1,234.56", so a copied-from-screen query
 * has to hit.
 */
const normalizeToken = (token: string): string => {
  const bare = token.startsWith("$") ? token.slice(1) : token;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(bare)) return bare.replace(/,/g, "");
  // pt-BR/es full form, both separators — "1.234,56". The entry fields
  // accept it (dollarsToCents's whichever-separator-is-last rule), so a
  // query written the same way has to hit the same row.
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(bare))
    return bare.replace(/\./g, "").replace(",", ".");
  if (/^\d+,\d{1,2}$/.test(bare)) return bare.replace(",", ".");
  return bare;
};

const tokens = (query: string): string[] =>
  fold(query).split(/\s+/).map(normalizeToken).filter(Boolean);

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
