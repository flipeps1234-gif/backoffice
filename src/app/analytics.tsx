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

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const isPublicPath = (path: string): boolean =>
  !path.startsWith("/app") && !path.startsWith("/api");

type GtagFn = (...args: unknown[]) => void;
type GaWindow = Window & {
  dataLayer?: unknown[];
  gtag?: GtagFn;
  __gaReady?: boolean;
} & Record<string, unknown>;

const noSubscribe = () => () => {};

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
