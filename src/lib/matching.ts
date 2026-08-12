import type { Client } from "./client";
import type { Sale } from "./sale";
import { saleTotalCents } from "./sale";
import type { Transaction } from "./transaction";

/**
 * The matching engine — the ═══ arrow in FLOW.md. One module, pure.
 *
 * On every ingested batch, scan OPEN + EXPECTED sales. A transaction
 * matches a sale when:
 *   - the amount is EXACT (integer cents, no tolerance), and
 *   - the client name fuzzy-matches the payer (same Levenshtein rule the
 *     dedupe module uses — OCR slips shouldn't break a match), and
 *   - the dates are within ±10 days (a missing txn date is a wildcard,
 *     same convention as dedupe).
 *
 * When several sales qualify for one transaction, PREFER a due recurring
 * instance for that client; if that narrows it to exactly one, it's a
 * match. Exactly one high-confidence hit auto-links (undoable). Anything
 * else goes to the suggestions queue. NEVER a silent guess.
 */

export const MATCH_WINDOW_DAYS = 10;

// Same fuzzy-name rules as extract/dedupe.ts. Duplicated deliberately
// rather than exported from there: dedupe compares payer-to-payer on the
// same document, this compares a typed client name to an OCR'd payer.
// They happen to agree today; they must be free to diverge.
const normName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const editDistance = (a: string, b: string): number => {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

export const sameName = (a: string, b: string): boolean => {
  const left = normName(a);
  const right = normName(b);
  if (left === right) return left !== "";
  if (left === "" || right === "") return false;
  const allowed = Math.min(2, Math.floor(Math.max(left.length, right.length) / 4));
  return editDistance(left, right) <= allowed;
};

const daysBetween = (a: string, b: string): number =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) /
  86_400_000;

/** A transaction with no readable date can't disqualify on date. */
const datesCompatible = (txnDate: string, saleDate: string): boolean =>
  txnDate === "" || daysBetween(txnDate, saleDate) <= MATCH_WINDOW_DAYS;

export type MatchOutcome = {
  /** Exactly-one hits: link these, mark the sale PAID. Undoable upstream. */
  links: { saleId: string; txnId: string }[];
  /** Ambiguous: the txn and every sale that qualified. UI shows a picker. */
  suggestions: { txnId: string; saleIds: string[] }[];
};

/**
 * Match one ingested batch against the outstanding sales.
 *
 * Greedy, batch-ordered, one txn per sale: once a sale is linked to a
 * transaction in this run it stops being a candidate for the next one —
 * two $60 payments from Rosa on the same screenshot should clear two $60
 * sales, not double-link one. Transactions already matched (or personal)
 * never participate.
 */
export const matchBatch = (
  batch: Transaction[],
  sales: Sale[],
  clients: Client[],
): MatchOutcome => {
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const links: MatchOutcome["links"] = [];
  const suggestions: MatchOutcome["suggestions"] = [];
  const claimed = new Set<string>();

  const outstanding = sales.filter(
    (s) => (s.state === "open" || s.state === "expected") && s.clientId,
  );

  for (const txn of batch) {
    // Money out can't pay a sale; a txn already linked stays linked;
    // personal rows are none of the engine's business. business === null
    // (not yet swiped) DOES participate — a match is itself the evidence
    // the payment was business, and the link marks it so.
    if (txn.direction === "out") continue;
    if (txn.matchedSaleId) continue;
    if (txn.business === false) continue;

    const candidates = outstanding.filter((sale) => {
      if (claimed.has(sale.id)) return false;
      if (saleTotalCents(sale) !== txn.amountCents) return false;
      const name = clientName.get(sale.clientId!) ?? "";
      if (!sameName(name, txn.payer)) return false;
      return datesCompatible(txn.date, sale.date);
    });

    if (candidates.length === 0) continue;

    let chosen = candidates;
    if (candidates.length > 1) {
      // Tie-break: prefer the due recurring instance for that client.
      const recurring = candidates.filter((s) => s.recurringTemplateId);
      if (recurring.length > 0) chosen = recurring;
    }

    if (chosen.length === 1) {
      links.push({ saleId: chosen[0].id, txnId: txn.id });
      claimed.add(chosen[0].id);
    } else {
      // Still ambiguous after the tie-break: surface every qualifier, not
      // just the preferred subset — the picker needs the full field.
      suggestions.push({ txnId: txn.id, saleIds: candidates.map((s) => s.id) });
    }
  }

  return { links, suggestions };
};

/**
 * The checkout-time question, sale-major: which already-ingested
 * transactions could be THIS sale's payment? matchBatch answers the
 * txn-major version and greedily claims first-come — fine for a batch
 * scan, wrong for "several candidates → show a list". Exactly one result
 * auto-links upstream; zero waits as EXPECTED; several is a picker.
 */
export const txnCandidatesForSale = (
  transactions: Transaction[],
  sale: Sale,
  clientName: string,
): Transaction[] =>
  transactions.filter(
    (txn) =>
      txn.direction === "in" &&
      !txn.matchedSaleId &&
      txn.business !== false &&
      txn.amountCents === saleTotalCents(sale) &&
      sameName(clientName, txn.payer) &&
      datesCompatible(txn.date, sale.date),
  );
