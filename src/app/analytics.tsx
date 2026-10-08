"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * Google Analytics 4 for the PUBLIC website — the company pages, not the
 * ledger. Six rules, all deliberate, checked in this order:
 *
 * 1. Off unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set. No ID, no script,
 *    no request — the default build is analytics-free.
 * 2. Never measures /app, /api, /demooo or /join. The privacy promise is
 *    about the books. Belt and braces: the two ways into the app from the
 *    public site are full-document navigations (so the tag never rides
 *    along), AND whenever the path is not public the documented opt-out
 *    flag `window["ga-disable-<ID>"]` is set, so a resident tag drops
 *    every hit. The privacy page says exactly this: the app never SENDS
 *    analytics.
 * 3. Do Not Track AND Global Privacy Control are honored: a browser
 *    asking not to be tracked, or signalling an opt-out of sale/sharing
 *    (GPC — the signal California and several other US states require
 *    sites to honor as an opt-out), gets nothing loaded at all — and is
 *    asked nothing: not even rule 4's region check is made.
 * 4. No analytics in the EU/EEA, the UK, Switzerland or Brazil (owner
 *    decision 2026-10-08: "No analytics there"). Only the server can see
 *    the country, so the page asks GET /api/geo — which answers
 *    {analytics: boolean} and nothing else — ONCE per browser session
 *    (the answer is kept in sessionStorage under REGION_KEY), and gtag is
 *    loaded ONLY after it answers true. No answer within 3 s, an error, or
 *    anything but a boolean means no analytics; only a real answer is
 *    kept, so a failure is asked again on the next page load. An unknown
 *    country is already a "no" on the server (lib/analytics-region.ts).
 * 5. Page views are GA4's own: `config` sends the first view and GA4's
 *    default Enhanced Measurement counts client-side navigations (the
 *    history-change page_view). No manual page_view — sending one per
 *    pathname on top of Enhanced Measurement double-counts every
 *    client navigation. DEPLOY.md notes to leave Enhanced Measurement
 *    on (it is the default).
 * 6. Google Signals and ad personalization are OFF in the config call,
 *    whatever the property's admin settings say: no cross-device joining
 *    to signed-in Google accounts, nothing fed to ads — so what the
 *    privacy page says about sharing no longer hangs on a dashboard
 *    toggle. It is also why the CSP allows no doubleclick host.
 *
 * No dependency: the official snippet is four lines and next/script
 * already exists (boring wins). The decisions are plain functions below,
 * exported for tests/unit/analytics-decision.test.mjs.
 */

/** The GA4 measurement ID. Not a secret — it ships in the public HTML
 *  of every site that uses GA — so the real property's ID is the
 *  committed default (same posture as SITE_URL). The env var still
 *  overrides: set a different ID to repoint, or set it to an EMPTY
 *  string to turn analytics off entirely (empty is falsy below). */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-JEM7B09P0L";

/** Every route that shows or moves a signed-in ledger. /demooo joined
 *  2026-09-27 when it became the desktop app (it was a static demo);
 *  /join (2026-10-08) is a route to come that must never be tracked. */
export const PRIVATE_PREFIXES: readonly string[] = ["/app", "/api", "/demooo", "/join"];

export const isPublicPath = (path: string): boolean =>
  !PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix));

/** navigator's two privacy signals (globalPrivacyControl — Firefox, Brave,
 *  DuckDuckGo and privacy extensions set it — isn't in the DOM types yet). */
export type PrivacySignals = { doNotTrack?: string | null; globalPrivacyControl?: unknown };

/** Rule 3: either signal is a no. */
export const privacySignalSaysNo = (signals: PrivacySignals): boolean =>
  signals.doNotTrack === "1" || signals.globalPrivacyControl === true;

/** Rules 1–3 and the sign-in-return guard, before anything is fetched:
 *  rule 4's request is made only when this is true. */
export const mayAskRegion = ({
  gaId,
  path,
  trackingAllowed,
  authReturn,
}: {
  gaId: string | undefined;
  path: string;
  /** Rule 3 already applied: false when DNT or GPC said no (and on the server). */
  trackingAllowed: boolean;
  authReturn: boolean;
}): boolean => Boolean(gaId) && isPublicPath(path) && trackingAllowed && !authReturn;

/** Where this session's answer to rule 4 is kept: "1" yes, "0" no. */
export const REGION_KEY = "contado.analyticsRegion";
export const REGION_TIMEOUT_MS = 3_000;

type SessionStore = Pick<Storage, "getItem" | "setItem">;

/** What /api/geo said, if it said anything usable: only a boolean counts. */
export const parseRegionAnswer = (body: unknown): boolean | null => {
  if (typeof body !== "object" || body === null) return null;
  const answer = (body as { analytics?: unknown }).analytics;
  return typeof answer === "boolean" ? answer : null;
};

/** This session's kept answer, or null (none yet, or storage blocked). */
export const readRegionAnswer = (storage: SessionStore | null): boolean | null => {
  try {
    const kept = storage?.getItem(REGION_KEY);
    return kept === "1" ? true : kept === "0" ? false : null;
  } catch {
    return null;
  }
};

const keepRegionAnswer = (storage: SessionStore | null, allowed: boolean) => {
  try {
    storage?.setItem(REGION_KEY, allowed ? "1" : "0");
  } catch {
    // Storage blocked: the next page load asks again. Nothing else changes.
  }
};

/**
 * Rule 4: may analytics load in this visitor's region? The session's kept
 * answer if there is one; otherwise one ask, through `askServer` (GET
 * /api/geo's parsed body — it rejects on any failure). Never throws: an
 * error, no answer within `timeoutMs` (the request is then aborted) or an
 * answer that is not a boolean all mean false, and only a real answer is
 * kept.
 */
export const regionAllowsAnalytics = async ({
  storage,
  askServer,
  timeoutMs = REGION_TIMEOUT_MS,
}: {
  storage: SessionStore | null;
  askServer: (signal: AbortSignal) => Promise<unknown>;
  timeoutMs?: number;
}): Promise<boolean> => {
  const kept = readRegionAnswer(storage);
  if (kept !== null) return kept;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  // A synchronous throw from askServer becomes a rejection here.
  const answered = new Promise<unknown>((resolve) => resolve(askServer(controller.signal))).then(
    parseRegionAnswer,
    () => null,
  );
  try {
    const answer = await Promise.race([answered, timedOut]);
    if (answer === null) return false;
    keepRegionAnswer(storage, answer);
    return answer;
  } finally {
    clearTimeout(timer);
  }
};

/** A sign-in return (magic link / Google) carries its credentials in the
 *  URL for the moment before the page forwards and auth-js clears them.
 *  GA must never be armed on such a URL — page_location is the full href. */
const carriesAuthReturn = (): boolean =>
  /[#&?](access_token|refresh_token|code|error_description)=/.test(
    window.location.hash + window.location.search,
  );

type GtagFn = (...args: unknown[]) => void;
type GaWindow = Window & {
  dataLayer?: unknown[];
  gtag?: GtagFn;
  __gaReady?: boolean;
} & Record<string, unknown>;

const noSubscribe = () => () => {};

// ---- rule 4's answer for this page load: asked at most once, whatever
// re-renders or client navigations follow; undefined until it answers.
let regionAnswer: boolean | undefined;
let regionAsked = false;
const regionListeners = new Set<() => void>();

const askRegion = () => {
  if (regionAsked) return;
  regionAsked = true;
  let storage: SessionStore | null = null;
  try {
    storage = window.sessionStorage; // reading the property can throw
  } catch {
    storage = null;
  }
  void regionAllowsAnalytics({
    storage,
    askServer: (signal) =>
      fetch("/api/geo", { signal, cache: "no-store", headers: { Accept: "application/json" } }).then(
        (response) => {
          if (!response.ok) throw new Error(`geo ${response.status}`);
          return response.json();
        },
      ),
  })
    .catch(() => false)
    .then((allowed) => {
      regionAnswer = allowed;
      for (const listener of regionListeners) listener();
    });
};

const subscribeRegion = (listener: () => void) => {
  regionListeners.add(listener);
  return () => {
    regionListeners.delete(listener);
  };
};

/** True only once /api/geo (or this session's kept answer) said yes. */
const useRegionAllows = (): boolean =>
  useSyncExternalStore(subscribeRegion, () => regionAnswer === true, () => false);

/**
 * Fire a GA4 event from anywhere on the public site. Every guard the
 * page-view path has applies here too, by construction: if the ID is
 * unset, the browser sent Do Not Track or Global Privacy Control, the
 * region check has not said yes, or GA was never armed on this page,
 * `window.gtag` does not exist and this is a no-op. The path
 * check is belt-and-braces for the shared components (the language
 * picker also renders inside /app). Events carry NO personal data —
 * names and coarse params only, never an email or an amount.
 */
export function trackEvent(
  name: "founding_signup" | "open_app_click" | "language_switch",
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined" || !GA_ID) return;
  if (!isPublicPath(window.location.pathname)) return;
  const w = window as unknown as GaWindow;
  if (!w.gtag) return;
  w.gtag("event", name, { ...params });
}

/** True only on a hydrated client that has asked for neither Do Not Track
 *  nor Global Privacy Control. The server snapshot is false, so the server
 *  renders nothing and the client decides after hydration — no mismatch,
 *  no flash of a script. */
const useTrackingAllowed = (): boolean =>
  useSyncExternalStore(
    noSubscribe,
    () => !privacySignalSaysNo(navigator as Navigator & PrivacySignals),
    () => false,
  );

export default function Analytics() {
  const pathname = usePathname();
  const allowed = useTrackingAllowed();
  const regionAllows = useRegionAllows();
  const path = pathname ?? "/";
  const publicPath = isPublicPath(path);
  const enabled = Boolean(GA_ID) && allowed && publicPath && regionAllows;

  // The opt-out flag follows the path: set inside the app, cleared on
  // public pages. Runs whether or not the tag is loaded — it is the
  // guarantee, not the script gate.
  useEffect(() => {
    if (!GA_ID) return;
    (window as unknown as GaWindow)[`ga-disable-${GA_ID}`] = !publicPath;
  }, [publicPath]);

  // Rule 4, asked only once rules 1–3 say yes: a browser sending DNT or
  // GPC, a private path or a sign-in return makes no request at all.
  useEffect(() => {
    if (!mayAskRegion({ gaId: GA_ID, path, trackingAllowed: allowed, authReturn: carriesAuthReturn() })) return;
    askRegion();
  }, [allowed, path]);

  // Install the queue + config once, before gtag.js arrives: the stub
  // pushes the arguments object itself (what gtag.js drains), in the
  // order js → config. The first page_view comes from config.
  useEffect(() => {
    if (!enabled || !GA_ID) return;
    if (carriesAuthReturn()) return;
    const w = window as unknown as GaWindow;
    w.dataLayer = w.dataLayer ?? [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments);
      };
    }
    if (!w.__gaReady) {
      w.gtag("js", new Date());
      // Rule 6: Signals and ad personalization off, from the tag itself.
      w.gtag("config", GA_ID, {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      w.__gaReady = true;
    }
  }, [enabled]);

  if (!enabled) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID!)}`}
      strategy="afterInteractive"
    />
  );
}
