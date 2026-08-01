import { createClient } from "@supabase/supabase-js";

/**
 * Server-side auth check for API routes. Uses the same public URL + anon key
 * (NEXT_PUBLIC_ vars exist on the server too); the access token itself is
 * what proves the caller is signed in.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Returns the signed-in user, or null for a missing/invalid token. */
export const verifyAccessToken = async (
  token: string | null,
): Promise<{ accountId: string; email: string | null } | null> => {
  if (!isSupabaseConfigured || !token) return null;

  const supabase = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { accountId: data.user.id, email: data.user.email ?? null };
};

/** Identifies the shared demo account (see DEMO_EXTRACTION in the route). */
export const isDemoAccount = (email: string | null): boolean => {
  const demoEmail = process.env.DEMO_EMAIL;
  return Boolean(demoEmail && email && email.toLowerCase() === demoEmail.toLowerCase());
};
