import type { SupabaseClient } from "@supabase/supabase-js";

type Auth = SupabaseClient["auth"];
type SessionResult = Awaited<ReturnType<Auth["getSession"]>>;

/**
 * Did auth-js DISCARD this tab's token refresh? Two tabs that wake together
 * (both parked on the same outage, or one tab's 30 s auto-refresh tick
 * meeting the other's save) refresh the same token; GoTrue answers both,
 * and auth-js 2.111 keeps only the answer that lands first — the loser gets
 * `{ session: null, error }` with this error (409) while the rotated session
 * already sits in the shared storage. Nothing is wrong with the session.
 * Checked by name, as auth-js's own isAuthRefreshDiscardedError does, so
 * this module has no SDK import and the unit test can load it bare.
 */
export const isDiscardedRefresh = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "AuthRefreshDiscardedError";

/**
 * getSession(), read again after a discarded refresh: the next read answers
 * from storage with no network. Bounded to two re-reads so a client that
 * keeps discarding (the storage cleared under it by a concurrent sign-out)
 * still reports what it saw. Every caller that decides "signed out?" from a
 * session read goes through here — the write queue, Sign out, "Not me",
 * the upload's bearer token, the landing's redirect, the admin view.
 */
export async function readSession(auth: Pick<Auth, "getSession">): Promise<SessionResult> {
  let res = await auth.getSession();
  for (let again = 0; again < 2 && res.error && isDiscardedRefresh(res.error); again += 1) {
    res = await auth.getSession();
  }
  return res;
}
