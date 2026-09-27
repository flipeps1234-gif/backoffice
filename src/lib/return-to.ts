/**
 * Where a sign-in should land. Magic links and Google both return to the
 * bare origin (the only redirect Supabase allows), and the landing page
 * forwards the #access_token to /app. The desktop app (/demooo) shows the
 * same sign-in, so it records itself here first and the landing forwards
 * there instead. Per device (localStorage, like every other preference),
 * valid for an hour — a magic link's own lifetime — and consumed on use,
 * so an old visit can never hijack a later /app sign-in.
 */

const KEY = "contado.returnTo";
const TTL_MS = 60 * 60 * 1000;
/** Only these paths may be returned to — never an arbitrary URL. */
const ALLOWED = new Set(["/app", "/demooo"]);

export function rememberReturnTo(path: string, now = Date.now()): void {
  if (!ALLOWED.has(path)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: now }));
  } catch {
    // Private mode / blocked storage: the sign-in still lands on /app.
  }
}

/** Read and forget. Anything missing, stale, malformed or not on the
 *  allow-list answers "/app". */
export function takeReturnTo(now = Date.now()): string {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return "/app";
    const parsed = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (
      typeof parsed.path === "string" &&
      ALLOWED.has(parsed.path) &&
      typeof parsed.at === "number" &&
      now - parsed.at >= 0 &&
      now - parsed.at < TTL_MS
    ) {
      return parsed.path;
    }
  } catch {
    // Unreadable: fall through.
  }
  return "/app";
}
