/**
 * The caller's IP, for the per-IP limits on /api/founding and /api/extract.
 *
 * Production sits behind Cloudflare, which puts the real client in
 * `cf-connecting-ip`; Vercel sets `x-forwarded-for` to the PEER it accepted
 * the connection from — Cloudflare's edge when proxied, the caller itself
 * when someone reaches the Vercel deployment directly. That direct path is
 * reachable (the *.vercel.app host answers), and there `cf-connecting-ip`
 * is whatever the caller typed, so trusting it first keyed the limits on a
 * client-chosen string (pass-9 authz review). Rule: use `cf-connecting-ip`
 * only when the peer IS a Cloudflare edge; otherwise the peer is the client.
 *
 * The ranges are Cloudflare's published list (https://www.cloudflare.com/ips/),
 * read 2026-10-06 — DEPLOY.md says when to refresh them. Dependency-free
 * (no "server-only" import) so the unit test can load it bare; it is only
 * imported by route handlers.
 */
const CF_V4 = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
  "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
  "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];
const CF_V6 = [
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
  "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
];

/** An IPv4 or IPv6 address as a 128-bit integer (v4 in its own space), or null. */
const ipToInt = (ip: string): { value: bigint; bits: 32 | 128 } | null => {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.some((p) => p > 255)) return null;
    return { value: parts.reduce((acc, p) => (acc << BigInt(8)) + BigInt(p), BigInt(0)), bits: 32 };
  }
  if (!ip.includes(":")) return null;
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  let value = BigInt(0);
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    value = (value << BigInt(16)) + BigInt(parseInt(g, 16));
  }
  return { value, bits: 128 };
};

const inCidr = (ip: { value: bigint; bits: 32 | 128 }, cidr: string): boolean => {
  const [base, lenText] = cidr.split("/");
  const net = ipToInt(base);
  if (!net || net.bits !== ip.bits) return false;
  const shift = BigInt(ip.bits - Number(lenText));
  return ip.value >> shift === net.value >> shift;
};

export const isCloudflareIp = (ip: string): boolean => {
  const parsed = ipToInt(ip.trim());
  if (!parsed) return false;
  return (parsed.bits === 32 ? CF_V4 : CF_V6).some((cidr) => inCidr(parsed, cidr));
};

/** The client for rate limiting; "unknown" when no header says. */
export const clientIp = (headers: Pick<Headers, "get">): string => {
  const peer = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const cf = headers.get("cf-connecting-ip")?.trim() ?? "";
  if (cf && peer && isCloudflareIp(peer)) return cf;
  return peer || cf || "unknown";
};
