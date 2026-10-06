/**
 * Which failed saves are worth trying again, and how long to wait.
 *
 * The write queue (persist in upload-screen.tsx) used to run every save
 * exactly once: with no signal — the product's headline moment, a sale
 * logged in a driveway — the entry stayed on screen under a banner that
 * said "check your connection", nothing was ever sent again, and it was
 * gone on the next open. A save that never REACHED the server is safe to
 * repeat (every insert carries its own id, updates and deletes are
 * absolute), so those are retried until they land. A save the server
 * ANSWERED and refused (a constraint, a permission, a 4xx/5xx with a body)
 * is not: repeating it would fail the same way forever and hold up every
 * save queued behind it.
 */

/** supabase-js reports a fetch that never got an answer as an error whose
 *  message is `${name}: ${message}` of the browser's own exception —
 *  "TypeError: Failed to fetch" (Chrome), "TypeError: Load failed"
 *  (Safari), "TypeError: NetworkError when attempting to fetch resource."
 *  (Firefox) — and auth-js as an AuthRetryableFetchError. The lib wrappers
 *  rethrow `new Error(error.message)`, so the message is what survives. */
const NETWORK_MESSAGE =
  /failed to fetch|load failed|networkerror|network request failed|network connection was lost|internet connection appears to be offline|the request timed out|aborterror|timeouterror/i;

export const isNetworkSaveError = (cause: unknown): boolean => {
  if (typeof cause !== "object" || cause === null) return false;
  const { name, message } = cause as { name?: unknown; message?: unknown };
  if (name === "AuthRetryableFetchError") return true;
  // auth-js 2.111 discards this tab's token refresh when another tab's
  // refresh rotated the token first; the rotated session is already in
  // storage, so the save is as retryable as any (lib/supabase/session.ts).
  if (name === "AuthRefreshDiscardedError") return true;
  return typeof message === "string" && NETWORK_MESSAGE.test(message);
};

/** Wait before attempt n+1. Short at first (a blip), then every 30 s for
 *  as long as the page stays open; the `online` event, the tab coming back
 *  to the front and the banner's "Try now" all cut the wait short. */
const DELAYS_MS = [2_000, 5_000, 15_000, 30_000];
export const retryDelayMs = (attempt: number): number =>
  DELAYS_MS[Math.min(Math.max(attempt, 0), DELAYS_MS.length - 1)];

/** A parked save that lands after this long waited long enough that the
 *  owner may have entered it again on another device: the green line says
 *  to check for a double. */
export const LATE_LANDING_MS = 10 * 60_000;

/** One id per page load — the parked marker below is per tab. */
export const TAB_ID: string = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
})();

// ---- Cross-tab markers (localStorage; every helper is safe without it) ----
//
// The queue is per Ledger, per tab. Two things another tab needs to know:
// that THIS tab holds a save the network refused (its Sign out would lose
// it: it clears the session every tab shares), and that a save of some
// account's was lost on this device (its next mount here says so).

const PARKED_PREFIX = "contado.saveParked.";
/** A marker older than this belongs to a tab that is gone (closed,
 *  crashed, asleep past its retry): readers drop it. A parked tab stamps
 *  its marker again on every retry, at most 30 s apart. */
export const PARKED_STALE_MS = 90_000;

export const markParked = (tabId: string, now: number = Date.now()): void => {
  try {
    localStorage.setItem(PARKED_PREFIX + tabId, String(now));
  } catch {
    // No storage: the other tabs cannot be told.
  }
};

export const clearParked = (tabId: string): void => {
  try {
    localStorage.removeItem(PARKED_PREFIX + tabId);
  } catch {
    // Nothing to clear.
  }
};

/** Is ANOTHER tab of this browser holding a parked save right now? */
export const otherTabParked = (tabId: string, now: number = Date.now()): boolean => {
  try {
    const stale: string[] = [];
    let found = false;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PARKED_PREFIX) || key === PARKED_PREFIX + tabId) continue;
      const at = Number(localStorage.getItem(key));
      if (!Number.isFinite(at) || now - at > PARKED_STALE_MS) stale.push(key);
      else found = true;
    }
    for (const key of stale) localStorage.removeItem(key);
    return found;
  } catch {
    return false;
  }
};

const LOST_PREFIX = "contado.lostWrites.";
/** Blocked storage: the note still reaches a remount in this tab. */
const lostInMemory = new Set<string>();

/** A save for `accountId` was lost on this device — its Ledger unmounted
 *  (another tab's sign-out, a link for another account) under a parked or
 *  in-flight write. Said once, at that account's next mount here. The id
 *  is the account's opaque uuid, the same one the session itself stores. */
export const noteLostWrites = (accountId: string): void => {
  lostInMemory.add(accountId);
  try {
    localStorage.setItem(LOST_PREFIX + accountId, "1");
  } catch {
    // Remembered in memory only.
  }
};

export const takeLostWrites = (accountId: string): boolean => {
  let lost = lostInMemory.delete(accountId);
  try {
    if (localStorage.getItem(LOST_PREFIX + accountId) !== null) {
      localStorage.removeItem(LOST_PREFIX + accountId);
      lost = true;
    }
  } catch {
    // Nothing persisted.
  }
  return lost;
};
