import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { withFreshToken } from "./fresh-fetch";

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
  cached ??= createClient(url!, anonKey!, {
    auth: {
      // GoTrue's implicit flow delivers tokens in the FRAGMENT; a token in
      // the query string is nobody's sign-in link. auth-js would consume it
      // all the same (query parameters win over the hash in its URL parse),
      // so refuse it before it is read (pass-8 review). A fragment token
      // keeps the default: consumed, then confirmed by the gate.
      //
      // A function here REPLACES auth-js's own "is this a callback URL"
      // test (GoTrueClient._isImplicitGrantCallback), it does not add to
      // it: a bare `true` made every plain /app load take the URL-session
      // branch — fail, and skip session recovery — and left no path to the
      // PKCE test (pass-9 review). So: auth-js's test, minus the query.
      detectSessionInUrl: (url, params) =>
        Boolean(params.access_token || params.error || params.error_description || params.error_code) &&
        !url.searchParams.has("access_token"),
    },
    global: {
      // A token the SERVER says has expired is refreshed and the request
      // replayed once (lib/supabase/fresh-fetch.ts): auth-js refreshes by
      // the device clock, and a slow clock otherwise refused every save.
      fetch: withFreshToken(
        (input, init) => fetch(input, init),
        async () => {
          const result = await cached?.auth.refreshSession();
          return result && !result.error && result.data.session ? result.data.session.access_token : null;
        },
      ),
    },
  });
  return cached;
};
