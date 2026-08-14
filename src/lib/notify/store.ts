import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side DB access for WEBHOOK writes — Meta calling us carries no
 * user session, so RLS-scoped clients can't record delivery statuses or
 * opt-outs. If SUPABASE_SERVICE_ROLE_KEY is set (server env, NEVER
 * NEXT_PUBLIC, never asked for in chat — the owner sets it in Vercel/
 * .env.local themselves), webhooks write; without it the spike verifies,
 * parses and logs, and the console line says what WOULD have been saved.
 * A spike that silently drops data claims nothing; this one says so.
 */
export const serviceClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
