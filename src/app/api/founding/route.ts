import { securityClient, signupIpHash } from "@/lib/supabase/security";

/**
 * The founding-hundred signup (landing page CTA). Public by design —
 * only this server can invoke the write RPC. Shared database limits bound
 * per-IP and global attempts; the local counter is a cheap extra brake.
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

  const supabase = securityClient();
  if (!supabase) {
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
    Buffer.byteLength(normalized, "utf8") > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc("founding_signup_limited", {
      p_email: normalized,
      p_ip_hash: signupIpHash(ip),
    });
    if (error || typeof data !== "boolean") {
      console.error("Founding signup protection unavailable:", error?.code);
      return Response.json({ error: "Try again later." }, { status: 503 });
    }
    if (!data) {
      return Response.json({ error: "Please try again later." }, {
        status: 429, headers: { "Retry-After": "3600" },
      });
    }
  } catch {
    return Response.json({ error: "Try again later." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
