import { getSupabase } from "./client";

/**
 * Account deletion — the request/cancel half. The purge itself runs
 * server-side (migration 0013, pg_cron + SECURITY DEFINER): 7 days
 * after the request, the auth user row is deleted and every table
 * cascades. The client only ever touches its OWN request row.
 */

/** ISO timestamp of the pending request, or null. */
export const loadDeletionRequest = async (): Promise<string | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("deletion_requests")
    .select("requested_at")
    .maybeSingle<{ requested_at: string }>();
  if (error || !data) return null;
  return data.requested_at;
};

export const requestDeletion = async (accountId: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("deletion_requests")
    .upsert({ account_id: accountId });
  if (error) throw new Error(error.message);
};

export const cancelDeletion = async (accountId: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("deletion_requests")
    .delete()
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
};
