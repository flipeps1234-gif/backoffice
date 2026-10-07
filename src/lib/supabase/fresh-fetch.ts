/**
 * PostgREST answers a token the SERVER considers expired with 401 and code
 * PGRST301 ("JWT expired"). auth-js decides when to refresh by the DEVICE
 * clock: a phone whose clock is behind the server by more than auth-js's
 * 90 s margin keeps handing out a token the server already refuses, so every
 * save was reported refused and dropped ("reload and re-enter"), every load
 * failed, for (skew − 90 s) of every token lifetime — forever, on that phone
 * (pass-9 resilience review). A refresh asked for EXPLICITLY ignores the
 * clock — GoTrue honours the refresh token whatever the access token says —
 * so: refresh once, replay once, in one place for every request the client
 * makes. Dependency-free so the unit test can load it bare.
 */
export const isExpiredJwtResponse = async (response: Response): Promise<boolean> => {
  if (response.status !== 401) return false;
  try {
    const body = (await response.clone().json()) as { code?: unknown; message?: unknown } | null;
    return body?.code === "PGRST301" || /jwt expired/i.test(String(body?.message ?? ""));
  } catch {
    return false;
  }
};

/** Asks auth-js for a fresh session; the new access token, or null when it
 *  could not refresh (offline, a revoked refresh token, its 60 s failure
 *  cooldown) — then the 401 stands, and the save queue treats "JWT expired"
 *  as retryable (lib/save-retry.ts). */
export type RefreshToken = () => Promise<string | null>;

export const withFreshToken =
  (baseFetch: typeof fetch, refresh: RefreshToken): typeof fetch =>
  async (input, init) => {
    const first = await baseFetch(input, init);
    if (!(await isExpiredJwtResponse(first))) return first;
    const token = await refresh();
    if (!token) return first;
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("Authorization", `Bearer ${token}`);
    return baseFetch(input, { ...init, headers });
  };
