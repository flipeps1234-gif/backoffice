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
  notes: string | null;
  /** Absent from the list load on purpose — see loadSales. */
  photo?: string | null;
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
  notes: typeof row.notes === "string" ? row.notes : "",
  // Only a data URL renders; anything else from the jsonb-era paranoia
  // bucket is dropped rather than injected into an <img src>.
  photo:
    typeof row.photo === "string" && row.photo.startsWith("data:image/")
      ? row.photo
      : null,
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
  notes: sale.notes,
  photo: sale.photo,
});

export const loadSales = async (): Promise<Sale[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  // photo is deliberately NOT selected: a photo is ~400KB of base64 text
  // per row, and this list is re-downloaded on every app open — with
  // photos included, one user with 25 photos pulls ~10MB per boot, and a
  // handful of such users exhausts the whole project's free-tier egress.
  // loadPhotoIds tells the UI which sales HAVE one; loadClientPhotos
  // fetches the bytes when a client's history actually shows them.
  const rows = await loadAllPages<Row>((from, to) =>
    supabase
      .from("sales")
      .select(
        "id, client_id, occurred_on, line_items, state, method, matched_txn_id, recurring_template_id, notes",
      )
      .order("occurred_on", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
  return rows.map(toSale);
};

/** Ids of every sale that has a photo — bytes stay on the server. */
export const loadPhotoIds = async (): Promise<string[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const rows = await loadAllPages<{ id: string }>((from, to) =>
    supabase
      .from("sales")
      .select("id")
      .not("photo", "is", null)
      .order("id", { ascending: false })
      .range(from, to),
  );
  return rows.map((row) => row.id);
};

/** The photo bytes for ONE client's sales — fetched when their history
 *  opens, which is the only place the app renders them. */
export const loadClientPhotos = async (
  clientId: string,
): Promise<{ id: string; photo: string }[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("sales")
    .select("id, photo")
    .eq("client_id", clientId)
    .not("photo", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) =>
    typeof row.photo === "string" && row.photo.startsWith("data:image/")
      ? [{ id: row.id, photo: row.photo }]
      : [],
  );
};

/** One sale's settlement pointer, straight from the database — the
 *  authoritative answer to "whose payment row won?", and with WHICH
 *  method (a txn's source is provenance, not payment method — a
 *  hand-typed income row can be a digital payment, so method must
 *  come from the sale row, never be derived from source). */
export const loadSaleLink = async (
  id: string,
): Promise<{
  state: SaleState;
  method: "cash" | "digital" | null;
  matchedTxnId: string | null;
} | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sales")
    .select("state, method, matched_txn_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    state: asState(data.state),
    method:
      data.method === "cash" || data.method === "digital" ? data.method : null,
    matchedTxnId: data.matched_txn_id,
  };
};

/**
 * Settle a sale ONLY if it is still open/expected — the WHERE clause
 * makes the paid transition atomic, so a stale second device can't
 * re-settle an already-settled sale (doubled revenue, the exact race
 * 0008 closed for recurring instances). Returns whether this caller won.
 */
export const settleSale = async (
  id: string,
  patch: Partial<Sale>,
): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const row: Record<string, unknown> = {};
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.method !== undefined) row.method = patch.method;
  if (patch.matchedTxnId !== undefined) row.matched_txn_id = patch.matchedTxnId;

  const { data, error } = await supabase
    .from("sales")
    .update(row)
    .eq("id", id)
    .in("state", ["open", "expected"])
    .select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
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
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.photo !== undefined) row.photo = patch.photo;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("sales").update(row).eq("id", id);
  if (error) throw new Error(error.message);
};

/**
 * The ids the database ACTUALLY holds for a set of templates' instances,
 * keyed by (template, date) at the caller. The readback that must follow
 * insertGeneratedSales: when a concurrent boot won 0008's unique index,
 * ON CONFLICT DO NOTHING silently dropped THIS device's row, and the
 * freshly minted in-memory id points at nothing — a phantom whose later
 * settlement corrupts (no sale row to settle; the live twin stays open
 * and gets settled again). See the load effect's remap.
 */
export const loadInstanceIds = async (
  templateIds: string[],
): Promise<{ id: string; recurringTemplateId: string; date: string }[]> => {
  const supabase = getSupabase();
  if (!supabase || templateIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sales")
    .select("id, recurring_template_id, occurred_on")
    .in("recurring_template_id", templateIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    recurringTemplateId: String(row.recurring_template_id),
    date: String(row.occurred_on),
  }));
};

/**
 * Insert RECURRING INSTANCES with the race closed. Two devices generating
 * in the same minute both pass the in-memory idempotency check; the
 * unique index from 0008 makes the second insert a no-op instead of a
 * duplicate OPEN sale. ignoreDuplicates = ON CONFLICT DO NOTHING.
 */
export const insertGeneratedSales = async (
  sales: Sale[],
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase || sales.length === 0) return;

  const { error } = await supabase
    .from("sales")
    .upsert(
      sales.map((s) => toRow(s, accountId)),
      {
        onConflict: "account_id,recurring_template_id,occurred_on",
        ignoreDuplicates: true,
      },
    );
  if (error) throw new Error(error.message);
};
