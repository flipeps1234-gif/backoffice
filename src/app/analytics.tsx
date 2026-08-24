"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * Google Analytics 4 for the PUBLIC website — the company pages, not the
 * ledger. Four rules, all deliberate:
 *
 * 1. Off unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set. No ID, no script,
 *    no request — the default build is analytics-free.
 * 2. Never measures /app or /api. The privacy promise is about the
 *    books. Belt and braces: the two ways into the app from the public
 *    site are full-document navigations (so the tag never rides along),
 *    AND whenever the path is not public the documented opt-out flag
 *    `window["ga-disable-<ID>"]` is set, so a resident tag drops every
 *    hit. The privacy page says exactly this: the app never SENDS
 *    analytics.
 * 3. Do Not Track is honored: a browser asking not to be tracked gets
 *    nothing loaded at all.
 * 4. Page views are GA4's own: `config` sends the first view and GA4's
 *    default Enhanced Measurement counts client-side navigations (the
 *    history-change page_view). No manual page_view — sending one per
 *    pathname on top of Enhanced Measurement double-counts every
 *    client navigation. DEPLOY.md notes to leave Enhanced Measurement
 *    on (it is the default).
 *
 * No dependency: the official snippet is four lines and next/script
 * already exists (boring wins).
 */

/** The GA4 measurement ID. Not a secret — it ships in the public HTML
 *  of every site that uses GA — so the real property's ID is the
 *  committed default (same posture as SITE_URL). The env var still
 *  overrides: set a different ID to repoint, or set it to an EMPTY
 *  string to turn analytics off entirely (empty is falsy below). */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-JEM7B09P0L";

const isPublicPath = (path: string): boolean =>
  !path.startsWith("/app") && !path.startsWith("/api");

type GtagFn = (...args: unknown[]) => void;
type GaWindow = Window & {
  dataLayer?: unknown[];
  gtag?: GtagFn;
  __gaReady?: boolean;
} & Record<string, unknown>;

const noSubscribe = () => () => {};

/**
 * Fire a GA4 event from anywhere on the public site. Every guard the
 * page-view path has applies here too, by construction: if the ID is
 * unset, the browser sent Do Not Track, or GA was never armed on this
 * page, `window.gtag` does not exist and this is a no-op. The path
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

/** True only on a hydrated client that has NOT asked for Do Not Track.
 *  The server snapshot is false, so the server renders nothing and the
 *  client decides after hydration — no mismatch, no flash of a script. */
const useTrackingAllowed = (): boolean =>
  useSyncExternalStore(
    noSubscribe,
    () => navigator.doNotTrack !== "1",
    () => false,
  );

export default function Analytics() {
  const pathname = usePathname();
  const allowed = useTrackingAllowed();
  const publicPath = isPublicPath(pathname ?? "/");
  const enabled = Boolean(GA_ID) && allowed && publicPath;

  // The opt-out flag follows the path: set inside the app, cleared on
  // public pages. Runs whether or not the tag is loaded — it is the
  // guarantee, not the script gate.
  useEffect(() => {
    if (!GA_ID) return;
    (window as unknown as GaWindow)[`ga-disable-${GA_ID}`] = !publicPath;
  }, [publicPath]);

  // Install the queue + config once, before gtag.js arrives: the stub
  // pushes the arguments object itself (what gtag.js drains), in the
  // order js → config. The first page_view comes from config.
  useEffect(() => {
    if (!enabled || !GA_ID) return;
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
      w.gtag("config", GA_ID);
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
