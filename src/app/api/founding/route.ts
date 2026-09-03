import { createClient } from "@supabase/supabase-js";

/**
 * The founding-hundred signup (landing page CTA). Public by design —
 * the table's RLS allows anon INSERT and nothing else, so the worst a
 * caller can do is add email rows. Same in-memory rate limiter as
 * /api/demo-session: per serverless instance, a speed bump not a wall
 * (documented in DEPLOY.md).
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; windowStart: number }>();

const rateLimited = (ip: string): boolean => {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    if (hits.size > 10_000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
};

export async function POST(request: Request) {
  // Cloudflare fronts production and sets cf-connecting-ip to the real
  // client IP; x-forwarded-for is the fallback for anything else (local
  // dev, previews, or a host not behind Cloudflare).
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (rateLimited(ip)) {
    return Response.json({ error: "Give it a minute." }, { status: 429 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof email !== "string") {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();
  if (
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Migration 0020 moves the write behind a SECURITY DEFINER RPC so the
  // table itself is closed to direct client inserts (the anon key could
  // otherwise write arbitrary rows straight past this route's own
  // validation and rate limiter). The RPC does its own ON CONFLICT DO
  // NOTHING, so it never raises 23505 itself.
  let { error } = await supabase.rpc("founding_signup", { p_email: normalized });

  // 42883 (Postgres: function does not exist) or PGRST202 (PostgREST:
  // function missing from its schema cache) means 0020 hasn't been
  // applied to this database yet. Fall back to the pre-0020 direct
  // insert so deploy order between the migration and this route doesn't
  // matter — delete this fallback once 0020 is confirmed applied
  // everywhere (see DEPLOY.md).
  if (error && (error.code === "42883" || error.code === "PGRST202")) {
    ({ error } = await supabase
      .from("founding_list")
      .insert({ email: normalized }));
  }

  // 23505 = unique violation: already on the list. That's a success —
  // never an error a caller can use to probe who signed up. (Only the
  // fallback insert above can actually raise this.)
  if (error && error.code !== "23505") {
    // The code makes Vercel logs diagnosable at a glance — e.g.
    // PGRST205 = the table doesn't exist (migration never ran).
    console.error("founding signup failed:", error.code, error.message);
    return Response.json({ error: "Try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
