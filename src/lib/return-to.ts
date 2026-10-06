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
 * there). Two markers make up the proof the app can have:
 *
 * - `contado.signinStarted`: set when a sign-in is started here, WITH the
 *   address it was started for (pass-3 review: a timestamp alone would
 *   let any session arriving within the hour through — the attacker's
 *   link in the same inbox as the real one). Google has no address at
 *   start time, so that marker accepts any session.
 * - `contado.linkPending`: set the moment a page opens with tokens in
 *   its URL, cleared when the person confirms or signs out. PERSISTED,
 *   because the session auth-js stores is persisted and broadcast to
 *   every tab: a confirmation held only in the tab that carried the hash
 *   was skipped by closing that tab, or by having /app open in another
 *   (pass-3 review). Every UploadScreen reads it, in every tab, on every
 *   session change.
 *
 * Absent proof, the gate shows who the device is now signed in as and
 * asks before letting them in; cross-device links — the product's
 * promise — still work, with one confirmation. Same hour, same storage
 * as the return path.
 */
export function markSignInStarted(who: string | "google", now = Date.now()): void {
  try {
    localStorage.setItem(STARTED_KEY, JSON.stringify({ at: now, who: who === "google" ? "google" : who.trim().toLowerCase() }));
  } catch {
    // No storage: the confirmation screen is shown, which is the safe side.
  }
}

/** Was a sign-in for THIS address (or any, via Google) started on this
 *  device within the last hour? Does not consume the marker (React can run
 *  an initializer twice); clear it with clearSignInStarted once the
 *  session has been taken in. */
export function signInStartedHereFor(email: string | null | undefined, now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(STARTED_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at?: unknown; who?: unknown };
    if (typeof parsed.at !== "number" || !(now - parsed.at >= 0 && now - parsed.at < TTL_MS)) return false;
    if (parsed.who === "google") return true;
    return typeof parsed.who === "string" && typeof email === "string" && parsed.who === email.trim().toLowerCase();
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

const PENDING_KEY = "contado.linkPending";
const PENDING_EVENT = "contado:linkPending";
const notifyPending = () => {
  try {
    window.dispatchEvent(new Event(PENDING_EVENT));
  } catch {
    // No window: nothing listening.
  }
};

/** A session arrived (or is arriving) from a URL on this device and has
 *  not been confirmed. Written before the session exists; the flag, not
 *  the id, is the state. */
export function markLinkPending(): void {
  try {
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    // No storage: this tab still confirms through its own state.
  }
  notifyPending();
}

export function clearLinkPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear.
  }
  notifyPending();
}

/** For useSyncExternalStore: this tab's writes (the event above) and other
 *  tabs' (the storage event — the session they saved is ours too). */
export function subscribeLinkPending(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PENDING_KEY) onChange();
  };
  window.addEventListener(PENDING_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PENDING_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function linkPendingSnapshot(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}
