import { createClient } from "@supabase/supabase-js";

/**
 * Exchanges the demo word for a REAL session on the shared tester account.
 *
 * The account's credentials live only in server env (DEMO_EMAIL +
 * DEMO_PASSWORD) — never in the browser bundle. By design, anyone who types
 * the demo word gets in, so this endpoint is deliberately public: it can
 * only ever mint sessions for that one account, whose rows are fenced off
 * from every real account by row level security. The tester session uses
 * the real extraction provider by design — the owner caps spend on the
 * OpenAI side, and DEMO_EXTRACTION=mock flips it back to the free mock.
 *
 * The demo word is checked SERVER-SIDE now: the client sends { word } and
 * this route compares it to DEMO_WORD (default "tester", same fallback the
 * client hardcodes) before ever calling Supabase. Not a secret — it's public
 * in the client bundle either way — it just stops a bodyless POST from
 * reaching signInWithPassword for free.
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

// Cloudflare sits in front of production; Vercel's x-forwarded-for is
// overwritten with the edge IP there, so prefer Cloudflare's own header.
const clientIp = (request: Request): string =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

export async function POST(request: Request) {
  const ip = clientIp(request);
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

  // Tolerate an empty/invalid body as simply "missing" — same generic
  // failure as a wrong word, never a distinct error that would let a caller
  // tell the two apart.
  const body = (await request.json().catch(() => null)) as
    | { word?: string }
    | null;
  const expectedWord = process.env.DEMO_WORD ?? "tester";
  if (body?.word !== expectedWord) {
    return Response.json(
      { error: "The test account couldn't sign in right now." },
      { status: 401 },
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
    // Supabase Auth rate-limits /token PER IP, and every visitor's
    // sign-in leaves Vercel through a small shared egress pool — a
    // landing-page burst of ~30 demo starts in 5 minutes trips it for
    // everyone at once. That's load, not breakage: say so, or a traffic
    // spike reads as the product being down.
    if (error?.status === 429) {
      return Response.json(
        { error: "Lots of people are trying the demo right now — give it a minute." },
        { status: 429 },
      );
    }
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
