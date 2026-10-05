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
  return typeof message === "string" && NETWORK_MESSAGE.test(message);
};

/** Wait before attempt n+1. Short at first (a blip), then every 30 s for
 *  as long as the page stays open; the `online` event, the tab coming back
 *  to the front and the banner's "Try now" all cut the wait short. */
const DELAYS_MS = [2_000, 5_000, 15_000, 30_000];
export const retryDelayMs = (attempt: number): number =>
  DELAYS_MS[Math.min(Math.max(attempt, 0), DELAYS_MS.length - 1)];
