import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side DB access for WEBHOOK writes — Meta/Twilio calling us carries
 * no user session, so RLS-scoped clients can't record delivery statuses or
 * opt-outs. Requires BOTH SUPABASE_SERVICE_ROLE_KEY and the calling
 * provider's own signing secret (TWILIO_AUTH_TOKEN or WHATSAPP_APP_SECRET) —
 * a service-role key with no signature check configured would let an
 * unverified ("unsigned") POST write straight to the database. Without the
 * pair the spike verifies, parses and logs; the console line says what
 * WOULD have been saved. A spike that silently drops data claims nothing;
 * this one says so.
 */
export const serviceClient = (
  provider: "twilio" | "whatsapp",
): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const providerSecret =
    provider === "twilio"
      ? process.env.TWILIO_AUTH_TOKEN
      : process.env.WHATSAPP_APP_SECRET;
  if (!url || !key || !providerSecret) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
