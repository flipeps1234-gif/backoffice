import { createClient } from "@supabase/supabase-js";

/**
 * Exchanges the demo word for a REAL session on the shared tester account.
 *
 * The account's credentials live only in server env (DEMO_EMAIL +
 * DEMO_PASSWORD) — never in the browser bundle. By design, anyone who types
 * the demo word gets in, so this endpoint is deliberately public: it can
 * only ever mint sessions for that one account, whose rows are fenced off
 * from every real account by row level security. The tester session is
 * additionally pinned to the free mock extractor in /api/extract, so it
 * cannot spend OpenAI budget.
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
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    return Response.json(
      { error: "The test account isn't set up on this deployment." },
      { status: 501 },
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    console.error("Demo sign-in failed:", error?.message);
    return Response.json(
      { error: "The test account couldn't sign in right now." },
      { status: 502 },
    );
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
