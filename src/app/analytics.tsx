"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * Google Analytics 4 for the PUBLIC website — the company pages, not the
 * ledger. Three rules, all deliberate:
 *
 * 1. Off unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set. No ID, no script,
 *    no request — the default build is analytics-free.
 * 2. Never on /app or /api. The privacy promise is about the books; the
 *    app never loads a third-party tag, whatever the env says.
 * 3. Do Not Track is honored: a browser asking not to be tracked gets
 *    nothing loaded at all.
 *
 * Page views are sent by hand on every pathname change (send_page_view is
 * off in config) so App Router client navigations count as views — the
 * tag alone only sees the first load. The gtag stub is installed by the
 * effect, so the queue is in the right order (js → config → page_view)
 * whenever gtag.js finishes loading. No dependency: the official snippet
 * is four lines and next/script already exists (boring wins).
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const isPublicPath = (path: string): boolean =>
  !path.startsWith("/app") && !path.startsWith("/api");

type GtagFn = (...args: unknown[]) => void;
type GaWindow = Window & { dataLayer?: unknown[]; gtag?: GtagFn; __gaReady?: boolean };

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
  const enabled = Boolean(GA_ID) && allowed && isPublicPath(pathname ?? "/");

  useEffect(() => {
    if (!enabled || !pathname || !GA_ID) return;
    const w = window as GaWindow;
    w.dataLayer = w.dataLayer ?? [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        // gtag.js drains this queue on load; it expects the arguments
        // object itself, not an array copy.
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments);
      };
    }
    if (!w.__gaReady) {
      w.gtag("js", new Date());
      w.gtag("config", GA_ID, { send_page_view: false });
      w.__gaReady = true;
    }
    w.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [enabled, pathname]);

  if (!enabled) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID!)}`}
      strategy="afterInteractive"
    />
  );
}
