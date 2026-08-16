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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
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
  const { error } = await supabase
    .from("founding_list")
    .insert({ email: normalized });

  // 23505 = unique violation: already on the list. That's a success —
  // never an error a caller can use to probe who signed up.
  if (error && error.code !== "23505") {
    console.error("founding insert failed:", error.message);
    return Response.json({ error: "Try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
