"use client";

import { useLocale } from "./use-locale";

/**
 * "Skip to content" (WCAG 2.4.1): the first thing Tab reaches on every
 * public page and in /app, past the banner, the nav and the language
 * picker to <main id="content">. Hidden until focused, then the app's
 * selected-pill colors at the top left, above the sticky phone banner.
 *
 * The jump is a focus() call, not a URL change: a native #content
 * navigation adds a history entry the App Router didn't make (state null),
 * and its popstate handler skips those — after skipping and following any
 * link, Back left the new page on screen under the old URL. The href stays
 * for a page whose script hasn't run.
 */
export default function SkipLink({ inert }: { inert?: boolean }) {
  const { t } = useLocale();
  return (
    <a
      href="#content"
      inert={inert}
      onClick={(event) => {
        const main = document.getElementById("content");
        if (!main) return;
        event.preventDefault();
        // tabIndex={-1} on every <main id="content">; focus scrolls it into
        // view under the scroll-padding rules in globals.css.
        main.focus();
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-background"
    >
      {t("common.skipToContent")}
    </a>
  );
}
