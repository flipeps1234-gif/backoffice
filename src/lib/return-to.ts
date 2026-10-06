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
/** Sibling marker: "a sign-in was STARTED on this device" (see below). */
const STARTED_KEY = "contado.signinStarted";
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

/**
 * The implicit-grant flow has no proof that the browser consuming a
 * `#access_token` is the one that asked for it: any link carrying tokens
 * signs the device in, silently replacing whatever account was there
 * (auth lens, 2026-10-05 — an attacker's link would sign the victim into
 * the ATTACKER's account, and everything they entered would be read
 * there). This marker is the proof the app can have: set when a sign-in
 * is started here, read when a session arrives from a URL. Absent, the
 * gate shows who the device is now signed in as and asks before letting
 * them in (cross-device links — the product's promise — still work, with
 * one confirmation). Same hour, same storage as the return path.
 */
export function markSignInStarted(now = Date.now()): void {
  try {
    localStorage.setItem(STARTED_KEY, String(now));
  } catch {
    // No storage: the confirmation screen is shown, which is the safe side.
  }
}

/** Was a sign-in started on this device within the last hour? Does not
 *  consume the marker (React can run an initializer twice); clear it with
 *  clearSignInStarted once the session has been taken in. */
export function signInStartedHere(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(STARTED_KEY));
    return Number.isFinite(at) && at > 0 && now - at >= 0 && now - at < TTL_MS;
  } catch {
    return false;
  }
}

export function clearSignInStarted(): void {
  try {
    localStorage.removeItem(STARTED_KEY);
  } catch {
    // Nothing to clear.
  }
}
