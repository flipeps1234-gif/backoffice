import { getSupabase } from "./client";
import { loadAllPages } from "./paginate";
import type { Transaction, TransactionSource } from "@/lib/transaction";

/**
 * Maps between the Transaction the UI uses and the row shape in Postgres.
 *
 * `confidence` is deliberately not persisted: it describes how sure the
 * extractor was before the user confirmed the row. Once confirmed it's
 * history, not data.
 */

type Row = {
  id: string;
  payer: string;
  amount_cents: number;
  occurred_on: string | null;
  memo: string;
  source: string;
  direction: string;
  service_id: string | null;
  quantity: number | null;
  business: boolean | null;
};

const toTransaction = (row: Row): Transaction => ({
  id: row.id,
  payer: row.payer,
  amountCents: row.amount_cents,
  date: row.occurred_on ?? "",
  memo: row.memo,
  source: row.source === "manual" ? "manual" : "screenshot",
  direction: row.direction === "out" ? "out" : "in",
  serviceId: row.service_id,
  quantity: row.quantity,
  business: row.business,
  confidence: {},
});

const toRow = (tx: Transaction, accountId: string) => ({
  id: tx.id,
  account_id: accountId,
  payer: tx.payer,
  amount_cents: tx.amountCents,
  // An empty date string is "we couldn't read one", which is null, not epoch.
  occurred_on: tx.date === "" ? null : tx.date,
  memo: tx.memo,
  source: tx.source satisfies TransactionSource,
  direction: tx.direction,
  service_id: tx.serviceId,
  quantity: tx.quantity,
  business: tx.business,
});

export const loadTransactions = async (): Promise<Transaction[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Paged, not a bare select: PostgREST silently caps a response at the
  // project's max-rows and this one array feeds the totals, the history, the
  // dashboard AND the tax CSV. See loadAllPages. Sibling call site with the
  // same shape: loadServices in ./services.ts.
  const rows = await loadAllPages<Row>((from, to) =>
    supabase
      .from("transactions")
      .select(
        "id, payer, amount_cents, occurred_on, memo, source, direction, service_id, quantity, business",
      )
      .order("occurred_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      // A stable tiebreak, so a row can't sit on a page boundary and be
      // returned twice or skipped when two rows share a date and timestamp.
      .order("id", { ascending: false })
      .range(from, to),
  );

  return rows.map(toTransaction);
};

export const insertTransactions = async (
  transactions: Transaction[],
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase || transactions.length === 0) return;

  const { error } = await supabase
    .from("transactions")
    .insert(transactions.map((tx) => toRow(tx, accountId)));

  if (error) throw new Error(error.message);
};

/** Used by the confirmation sheet's edits and by swipe triage. */
export const updateTransaction = async (
  id: string,
  patch: Partial<Transaction>,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (patch.payer !== undefined) row.payer = patch.payer;
  if (patch.amountCents !== undefined) row.amount_cents = patch.amountCents;
  if (patch.date !== undefined) row.occurred_on = patch.date === "" ? null : patch.date;
  if (patch.memo !== undefined) row.memo = patch.memo;
  if (patch.direction !== undefined) row.direction = patch.direction;
  if (patch.serviceId !== undefined) row.service_id = patch.serviceId;
  if (patch.quantity !== undefined) row.quantity = patch.quantity;
  if (patch.business !== undefined) row.business = patch.business;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("transactions").update(row).eq("id", id);
  if (error) throw new Error(error.message);
};
