import { getSupabase } from "./client";
import { loadAllPages } from "./paginate";
import type { Client } from "@/lib/client";

type Row = {
  id: string;
  name: string;
  notes: string;
};

const toClient = (row: Row): Client => ({
  id: row.id,
  name: row.name,
  notes: row.notes,
});

export const loadClients = async (): Promise<Client[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const rows = await loadAllPages<Row>((from, to) =>
    supabase
      .from("clients")
      .select("id, name, notes")
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  return rows.map(toClient);
};

export const insertClient = async (
  client: Client,
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("clients").insert({
    id: client.id,
    account_id: accountId,
    name: client.name,
    notes: client.notes,
  });
  if (error) throw new Error(error.message);
};

export const updateClient = async (
  id: string,
  patch: Partial<Pick<Client, "name" | "notes">>,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("clients").update(row).eq("id", id);
  if (error) throw new Error(error.message);
};
