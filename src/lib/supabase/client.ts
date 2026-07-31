import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Both values are public by design — the anon key is
 * safe to ship because row level security is what actually protects the data.
 *
 * Returns null when the project isn't configured, so the app still runs
 * in-memory with no account. That keeps local development working without
 * credentials, and it's what you get before you've made a project.
 */

let cached: SupabaseClient | null = null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const getSupabase = (): SupabaseClient | null => {
  if (!isConfigured) return null;
  cached ??= createClient(url!, anonKey!);
  return cached;
};
