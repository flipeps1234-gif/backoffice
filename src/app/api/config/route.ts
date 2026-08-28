/**
 * Client configuration for the NATIVE app (v0.7): the Supabase URL and
 * anon key. Both are public by design — every browser session already
 * receives them in the JS bundle; this endpoint hands the same values
 * to the iOS app so no configuration ships hardcoded in the binary and
 * a key rotation needs no App Store release.
 *
 * minAppVersion exists so a future contract break can tell an old
 * binary to update instead of failing strangely.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  if (!url || !anonKey) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }
  return Response.json(
    { supabaseUrl: url, supabaseAnonKey: anonKey, minAppVersion: "1.0" },
    // Stable values; let clients and the CDN keep them for a day.
    { headers: { "cache-control": "public, max-age=86400" } },
  );
}
