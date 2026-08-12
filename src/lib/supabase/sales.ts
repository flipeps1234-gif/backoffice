import { getSupabase } from "./client";
import { loadAllPages } from "./paginate";
import { validateLineItems, type Sale, type SaleState } from "@/lib/sale";

/**
 * Sale rows. line_items crosses the jsonb boundary through
 * validateLineItems on every load — same trust-nothing posture as
 * extraction. A sale whose items ALL fail validation still loads (the
 * row exists and its state matters); it just totals zero and shows an
 * empty item list, which is visibly wrong rather than silently wrong.
 */

type Row = {
  id: string;
  client_id: string | null;
  occurred_on: string;
  line_items: unknown;
  state: string;
  method: string | null;
  matched_txn_id: string | null;
  recurring_template_id: string | null;
};

const asState = (raw: string): SaleState =>
  raw === "paid" || raw === "expected" ? raw : "open";

const toSale = (row: Row): Sale => ({
  id: row.id,
  clientId: row.client_id,
  lineItems: validateLineItems(row.line_items),
  date: row.occurred_on,
  state: asState(row.state),
  method: row.method === "cash" || row.method === "digital" ? row.method : null,
  matchedTxnId: row.matched_txn_id,
  recurringTemplateId: row.recurring_template_id,
});

const toRow = (sale: Sale, accountId: string) => ({
  id: sale.id,
  account_id: accountId,
  client_id: sale.clientId,
  occurred_on: sale.date,
  line_items: sale.lineItems,
  state: sale.state,
  method: sale.method,
  matched_txn_id: sale.matchedTxnId,
  recurring_template_id: sale.recurringTemplateId,
});

export const loadSales = async (): Promise<Sale[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const rows = await loadAllPages<Row>((from, to) =>
    supabase
      .from("sales")
      .select(
        "id, client_id, occurred_on, line_items, state, method, matched_txn_id, recurring_template_id",
      )
      .order("occurred_on", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
  return rows.map(toSale);
};

export const insertSales = async (
  sales: Sale[],
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase || sales.length === 0) return;

  const { error } = await supabase
    .from("sales")
    .insert(sales.map((s) => toRow(s, accountId)));
  if (error) throw new Error(error.message);
};

/**
 * Patch one sale. Same silent-zero-rows hazard as updateTransaction —
 * callers go through the serial write queue so the INSERT always lands
 * before any UPDATE to the same row.
 */
export const updateSale = async (
  id: string,
  patch: Partial<Sale>,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (patch.clientId !== undefined) row.client_id = patch.clientId;
  if (patch.date !== undefined) row.occurred_on = patch.date;
  if (patch.lineItems !== undefined) row.line_items = patch.lineItems;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.method !== undefined) row.method = patch.method;
  if (patch.matchedTxnId !== undefined) row.matched_txn_id = patch.matchedTxnId;
  if (patch.recurringTemplateId !== undefined)
    row.recurring_template_id = patch.recurringTemplateId;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("sales").update(row).eq("id", id);
  if (error) throw new Error(error.message);
};
