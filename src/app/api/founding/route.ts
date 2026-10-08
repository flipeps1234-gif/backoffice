import { securityClient, signupIpHash } from "@/lib/supabase/security";
import { clientIp } from "@/lib/request-ip";

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
  // Cloudflare's header only when the request really came through
  // Cloudflare — lib/request-ip.ts has the rule and the reason.
  const ip = clientIp(request.headers);
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
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
    // The list is read by a person, possibly in a spreadsheet: an
    // "address" opening with = + - is a formula there, never a mailbox.
    /^[=+\-]/.test(normalized)
  ) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const params = { p_email: normalized, p_ip_hash: signupIpHash(ip) };
  try {
    // The capped signup (0034): the founding hundred is a real hundred.
    const capped = await supabase.rpc("founding_signup_capped", params);
    if (!capped.error) {
      if (capped.data === "ok") return Response.json({ ok: true });
      if (capped.data === "full") {
        // 409, not 200: nothing was saved. The page says the offer is
        // full — and that anyone who already joined is still in.
        return Response.json({ error: "Full.", full: true }, { status: 409 });
      }
      if (capped.data === "limited") return limitedResponse();
      console.error("Founding signup answered", capped.data);
      return Response.json({ error: "Try again later." }, { status: 503 });
    }
    if (capped.error.code !== "PGRST202") {
      console.error("Founding signup protection unavailable:", capped.error.code);
      return Response.json({ error: "Try again later." }, { status: 503 });
    }
    // 0034 not applied yet (PGRST202: no such function): 0022's signup, as
    // before. Once 0034 is in, that function is capped too.
    const { data, error } = await supabase.rpc("founding_signup_limited", params);
    if (error || typeof data !== "boolean") {
      console.error("Founding signup protection unavailable:", error?.code);
      return Response.json({ error: "Try again later." }, { status: 503 });
    }
    if (!data) return limitedResponse();
  } catch {
    return Response.json({ error: "Try again later." }, { status: 503 });
  }
  return Response.json({ ok: true });
}

const limitedResponse = () =>
  Response.json({ error: "Please try again later." }, {
    status: 429, headers: { "Retry-After": "3600" },
  });

/**
 * Whether the founding offer is still open, so the landing page can say
 * "full" before anyone types an address. The same answer for everyone and
 * no personal data, so the CDN may share it for a few minutes. Before 0034
 * there is no cap: open. Any failure also answers open — the POST is the
 * real gate and says "full" itself.
 */
export async function GET() {
  const headers = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };
  const supabase = securityClient();
  if (!supabase) return Response.json({ open: true }, { headers });
  try {
    const { data, error } = await supabase.rpc("founding_open");
    if (error || typeof data !== "boolean") return Response.json({ open: true }, { headers });
    return Response.json({ open: data }, { headers });
  } catch {
    return Response.json({ open: true }, { headers });
  }
}
