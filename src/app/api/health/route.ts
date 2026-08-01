import { createClient } from "@supabase/supabase-js";

/**
 * Pinged daily by a Vercel cron (see vercel.json). Supabase's free tier
 * pauses projects after a week without activity — this trivial query counts
 * as activity, so a slow week can't take the database down.
 *
 * Public and harmless: RLS means the anonymous query can see zero rows.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return Response.json({ ok: true, supabase: "not configured" });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from("transactions")
    .select("id", { head: true, count: "exact" });

  return Response.json({ ok: !error, supabase: error ? error.message : "reached" });
}
