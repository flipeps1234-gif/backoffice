"use client";

import Mark from "./mark";

/** Fired by the app header's brand link. The mounted Ledger answers by
 *  closing whatever screen is open and returning to the hub, in place;
 *  it calls preventDefault() to say "handled". */
export const HOME_EVENT = "contado:home";

/**
 * The app header's mark + wordmark: one link to the app's own home — the
 * hub, not the public site (the public header's brand link goes to the
 * site's homepage; each surface points at its own front door).
 *
 * A real <a href="/app"> so it reads, focuses and cmd-clicks as a link.
 * A plain click, though, must not reload the document: the ledger is one
 * page whose screens are state, a reload would evict a half-typed entry
 * the finish-entry-first guard exists to protect, and would drop queued
 * writes still in flight. So the click asks the mounted ledger to go home
 * itself; only when nothing is listening (the terms gate, the sign-in
 * gate, where /app IS home) does the browser follow the href.
 */
export default function BrandHome() {
  return (
    <a
      href="/app"
      className="flex items-center gap-2"
      onClick={(event) => {
        // Modifier clicks and middle clicks mean "open in a new tab";
        // leave those to the browser.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        const ask = new CustomEvent(HOME_EVENT, { cancelable: true });
        window.dispatchEvent(ask);
        if (ask.defaultPrevented) event.preventDefault();
      }}
    >
      <Mark />
      contado
    </a>
  );
}
