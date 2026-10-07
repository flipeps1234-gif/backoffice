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
 * - `contado.signinStarted`: set when a sign-in is started here, WITH a
 *   digest of the address it was started for (pass-3 review: a timestamp
 *   alone would let any session arriving within the hour through — the
 *   attacker's link in the same inbox as the real one). Google has no
 *   address at start time, so that marker accepts any session. Cleared
 *   when the link lands here, on Continue, on every sign-out, and when
 *   found stale — the device never keeps it longer than the hour.
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
/** SHA-256 hex of the normalised address. The marker must only ever
 *  answer "is this the address the sign-in was started for?", and a digest
 *  answers that as well as the address would — without leaving the address
 *  itself in a shared computer's storage (privacy lens, 2026-10-05). */
const digest = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
};

export async function markSignInStarted(who: string | "google", now = Date.now()): Promise<void> {
  try {
    const tag = who === "google" ? "google" : await digest(who);
    localStorage.setItem(STARTED_KEY, JSON.stringify({ at: now, who: tag }));
  } catch {
    // No storage or no WebCrypto: the confirmation screen is shown, which
    // is the safe side.
  }
}

/** Was a sign-in for THIS address (or any, via Google) started on this
 *  device within the last hour? Does not consume a live marker (React can
 *  run an effect twice); a stale one is deleted on sight. Clear a live one
 *  with clearSignInStarted once the session has been taken in. */
export async function signInStartedHereFor(email: string | null | undefined, now = Date.now()): Promise<boolean> {
  try {
    const raw = localStorage.getItem(STARTED_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at?: unknown; who?: unknown };
    if (typeof parsed.at !== "number" || !(now - parsed.at >= 0 && now - parsed.at < TTL_MS)) {
      localStorage.removeItem(STARTED_KEY);
      return false;
    }
    if (parsed.who === "google") return true;
    return typeof parsed.who === "string" && typeof email === "string" && parsed.who === (await digest(email));
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

/** What auth-js reads from a URL: every fragment parameter, then every
 *  query parameter over it, the LAST duplicate winning — its
 *  parseParametersFromURL, replicated (the helper is not exported). The
 *  gate must see exactly what the SDK will consume: a hash-only regex and
 *  a first-duplicate read let a token in the query, a duplicate key or a
 *  percent-encoded key sign the device in unasked (pass-8 review; the
 *  unit test holds the two parsers equal on those shapes). */
export function callbackParams(href: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const url = new URL(href);
    if (url.hash && url.hash[0] === "#") {
      new URLSearchParams(url.hash.slice(1)).forEach((value, key) => {
        params[key] = value;
      });
    }
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch {
    // Not a URL: nothing arrives.
  }
  return params;
}

/** The subject (account id) of an access token, read WITHOUT
 *  verification — it only says which account the link signs in, so that
 *  tabs ask about that account and no other; the server verifies the
 *  token itself. null when there is no readable token. */
export function tokenSubject(token: string | null | undefined): string | null {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const sub = (JSON.parse(atob(padded)) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub !== "" ? sub : null;
  } catch {
    return null;
  }
}

/** The account whose session this device holds in storage right now
 *  (null: none, or storage blocked). Read before the SDK runs, so the tab
 *  a link opened can tell a link that BECAME the session from one that
 *  failed and left the old one in place. */
export function storedSessionUserId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.*-auth-token$/.test(key)) continue;
      const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as { user?: { id?: unknown } } | null;
      const id = parsed?.user?.id;
      return typeof id === "string" ? id : null;
    }
  } catch {
    // No storage, or not JSON: unknown.
  }
  return null;
}

/** Sessions that arrived (or are arriving) from URLs on this device and
 *  have not been confirmed — ONE ENTRY PER ACCOUNT, each stamped. Written
 *  before the session exists, so an entry carries what the URL itself
 *  says — the token's subject — and a tab asks only once its session IS
 *  that account (an anonymous flag made every tab drop the account it
 *  held and ask about the holder's own address for a round-trip; pass-7
 *  review). A list, not one value: a second link overwrote the first's
 *  entry and then, failing, cleared it — the open question for the first
 *  account fell in every tab (pass-8 review). `sub` null = an unreadable
 *  token: every tab asks. Entries older than an hour are dropped on read —
 *  a tab closed mid-load leaves one behind — EXCEPT the entry for the
 *  session the device holds, which is a live question however old it is
 *  (pass-9 review: the TTL dismissed an unanswered question by itself).
 *  Writers keep everything younger than a week, so a rewrite never drops
 *  an entry a reader would still show. */
const PENDING_TTL_MS = 60 * 60_000;
const PENDING_KEEP_MS = 7 * 24 * 60 * 60_000;
type PendingEntry = { sub: string | null; at: number };
export type LinkPending = { set: boolean; subs: (string | null)[] };

const readEntries = (
  raw: string,
  now: number,
  ttlMs: number = PENDING_TTL_MS,
  keep: string | null = null,
): PendingEntry[] => {
  if (raw === "") return [];
  try {
    const parsed = JSON.parse(raw) as { subs?: unknown; sub?: unknown };
    if (Array.isArray(parsed.subs)) {
      return parsed.subs
        .filter((e): e is { sub?: unknown; at?: unknown } => typeof e === "object" && e !== null)
        .map((e) => ({
          sub: typeof e.sub === "string" && e.sub !== "" ? e.sub : null,
          at: typeof e.at === "number" ? e.at : now,
        }))
        .filter((e) => (keep !== null && e.sub === keep) || now - e.at < ttlMs);
    }
    // {sub} — the flag's second shape (pass 7).
    return [{ sub: typeof parsed.sub === "string" && parsed.sub !== "" ? parsed.sub : null, at: now }];
  } catch {
    // "1" (the first shape) or anything else: set, no subject.
    return [{ sub: null, at: now }];
  }
};
const writeEntries = (entries: PendingEntry[]): void => {
  if (entries.length === 0) localStorage.removeItem(PENDING_KEY);
  else localStorage.setItem(PENDING_KEY, JSON.stringify({ subs: entries }));
};

export function markLinkPending(sub: string | null, now: number = Date.now()): void {
  try {
    const entries = readEntries(localStorage.getItem(PENDING_KEY) ?? "", now, PENDING_KEEP_MS).filter(
      (e) => e.sub !== sub,
    );
    entries.push({ sub, at: now });
    writeEntries(entries);
  } catch {
    // No storage: the tab that opened the link still asks through its own
    // state (upload-screen.tsx tabPending); other tabs cannot be told.
  }
  notifyPending();
}

/** Drop ONE account's entry — never another arrival's. `confirmed` (a
 *  Continue / Not me, or a link this device asked for) also drops the
 *  entries with no readable subject: that question had no other name. */
export function clearLinkPending(sub: string | null, confirmed = false, now: number = Date.now()): void {
  try {
    const entries = readEntries(localStorage.getItem(PENDING_KEY) ?? "", now, PENDING_KEEP_MS).filter(
      (e) => e.sub !== sub && !(confirmed && e.sub === null),
    );
    writeEntries(entries);
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

/** For useSyncExternalStore: the stored value itself ("" when unset or
 *  unreadable) — a primitive, so an unchanged flag is an unchanged snapshot. */
export function linkPendingSnapshot(): string {
  try {
    return localStorage.getItem(PENDING_KEY) ?? "";
  } catch {
    return "";
  }
}

/** `keep`: the account whose session this device holds — its entry is a
 *  live question and never ages out. */
export function parseLinkPending(raw: string, keep: string | null = null, now: number = Date.now()): LinkPending {
  const entries = readEntries(raw, now, PENDING_TTL_MS, keep);
  return { set: entries.length > 0, subs: entries.map((e) => e.sub) };
}
