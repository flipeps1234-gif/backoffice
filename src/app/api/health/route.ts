import { createClient } from "@supabase/supabase-js";

/**
 * Pinged daily by a Vercel cron (see vercel.json). Supabase's free tier
 * pauses a project after about a week without activity, and this trivial
 * query is meant to count as that activity.
 *
 * "Meant to" is doing real work in that sentence: the project paused anyway,
 * on 2026-08-12, with this cron in place since 2026-07-31. Treat the ping as
 * a reduction in risk, not a guarantee — and note that once a project IS
 * paused it stops resolving in DNS entirely, so this endpoint can no longer
 * wake it. Only the Supabase dashboard can. See DEPLOY.md.
 *
 * Public and harmless: RLS means the anonymous query can see zero rows.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Fine locally — the app runs in-memory without credentials. In
    // production it means someone shipped without the env vars, which is
    // an outage, so it should read as one.
    const configuredElsewhere = process.env.NODE_ENV === "production";
    return Response.json(
      { ok: !configuredElsewhere, supabase: "not configured" },
      { status: configuredElsewhere ? 503 : 200 },
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error, count } = await supabase
    .from("transactions")
    .select("id", { head: true, count: "exact" });

  // Assert something POSITIVE, don't just check for absence of an error.
  // With head:true there is no response body, and supabase-js does not
  // surface a 404 as an error — so when the transactions table did not
  // exist at all, this endpoint cheerfully reported {"ok":true,"reached"}
  // while every upload silently failed to save. Verified against the live
  // project: the identical request returns HTTP 404 (PGRST205) and `error`
  // is still null.
  //
  // A successful count is a number, even under RLS where it is 0. Null means
  // the query never really ran.
  if (!error && typeof count !== "number") {
    return Response.json(
      {
        ok: false,
        supabase:
          "reached, but the transactions table is missing — run the migrations in supabase/migrations",
      },
      { status: 503 },
    );
  }

  // 503, not 200-with-a-sad-body. This endpoint reported {"ok":false} for
  // days while the database was gone and NOTHING noticed, because the cron
  // that calls it and every uptime checker on earth read the status code,
  // not the JSON. A health check that cannot fail is not a health check.
  //
  // A non-2xx also makes the daily cron show up as FAILED in Vercel's log,
  // which is the only free alarm this project has.
  return Response.json(
    { ok: !error, supabase: error ? error.message : "reached" },
    { status: error ? 503 : 200 },
  );
}
