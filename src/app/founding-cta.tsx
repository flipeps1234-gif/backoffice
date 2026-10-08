"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { trackEvent } from "./analytics";
import { useLocale } from "./use-locale";

/**
 * The one call to action on the public site: the founding-hundred email
 * capture. Shared by the landing, pricing, the trade pages and contact
 * so the offer reads identically everywhere. Posts to /api/founding
 * (rate-limited; duplicates return ok — no enumeration).
 *
 * The hundred is a real hundred (migration 0034, owner decision
 * 2026-10-08). The page asks GET /api/founding once; when it answers
 * {open: false}, every CTA on the page says the hundred is full instead
 * of showing the form, and a POST answered 409 does the same. Full is
 * full for everyone: the server answers an address already on the list
 * exactly like a new one, and this page never says which it was — the
 * "full" copy tells anyone who joined that they are still in. No
 * countdown and no "spots left": the offer is open or it is full. Until
 * the server says full (the prerender, a slow or failed GET) the offer
 * shows, because the POST is the real gate.
 *
 * The notice under the field says what the address is for and links the
 * privacy page, which spells out how the list is kept and how to leave
 * it — so the disclosure sits where the email is asked for, not only on
 * /privacy.
 */

/** Only a clear {open: false} closes the offer: an error, an odd body or
 *  no answer leaves the form up and lets the POST decide. */
export const offerClosed = (body: unknown): boolean =>
  typeof body === "object" && body !== null && (body as { open?: unknown }).open === false;

/** What a POST's answer means for the form. 409 is the hundred being full;
 *  429 means "wait", not "retry now" — the generic error message would
 *  tell a rate-limited visitor to do exactly the wrong thing. */
export const submitOutcome = (status: number): "done" | "full" | "slow" | "error" =>
  status >= 200 && status < 300 ? "done" : status === 409 ? "full" : status === 429 ? "slow" : "error";

// ---- "Is the hundred full?" — one answer per page, shared by every CTA
// on it (the landing has two), so a 409 in one closes the other too.
let foundingFull = false;
let foundingAsked = false;
const fullListeners = new Set<() => void>();
/** Run just before the flip, while the form is still in the DOM: a CTA
 *  holding focus notes it, so focus moves to the "full" message instead
 *  of falling to <body> with the removed form. */
const beforeFull = new Set<() => void>();

const markFull = () => {
  if (foundingFull) return;
  for (const probe of beforeFull) probe();
  foundingFull = true;
  for (const listener of fullListeners) listener();
};

/** One GET per page load, whichever CTA mounts first. */
const askFoundingOpen = () => {
  if (foundingAsked) return;
  foundingAsked = true;
  fetch("/api/founding")
    .then((response) => (response.ok ? response.json() : null))
    .then((body: unknown) => {
      if (offerClosed(body)) markFull();
    })
    .catch(() => {
      // Unreachable or unreadable: the offer stays up; the POST decides.
    });
};

const subscribeFull = (listener: () => void) => {
  fullListeners.add(listener);
  return () => {
    fullListeners.delete(listener);
  };
};

/** False on the server and until the GET (or a 409) says full. */
const useFoundingFull = (): boolean => {
  useEffect(askFoundingOpen, []);
  return useSyncExternalStore(subscribeFull, () => foundingFull, () => false);
};

/**
 * Everything inside the card: the offer and its form, the "you're on the
 * list" answer, or — once the hundred is full — the full notice with the
 * way into the app. `heading` renders the offer's title and body (Cta);
 * without it only the form part shows (FoundingForm).
 */
function FoundingOffer({ heading }: { heading: boolean }) {
  const { t } = useLocale();
  const noticeId = useId();
  const full = useFoundingFull();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error" | "slow">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const fullTitleRef = useRef<HTMLElement | null>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const focusFullTitle = useRef(false);
  // The full title is an h2 in the card and a p in the bare form: one
  // callback ref fits both element types.
  const keepFullTitle = useCallback((node: HTMLElement | null) => {
    fullTitleRef.current = node;
  }, []);

  // Before the page flips to full: does this CTA hold focus? (beforeFull)
  useEffect(() => {
    const probe = () => {
      if (formRef.current?.contains(document.activeElement)) focusFullTitle.current = true;
    };
    beforeFull.add(probe);
    return () => {
      beforeFull.delete(probe);
    };
  }, []);

  // Someone who just joined keeps "You're on the list." even if the page
  // learns afterwards that the hundred filled.
  const showFull = full && state !== "done";

  // The form this visitor was in (or submitted) is gone: hand focus to
  // the answer, so it is read out and the keyboard has somewhere to be.
  useEffect(() => {
    if (!showFull || !focusFullTitle.current) return;
    focusFullTitle.current = false;
    fullTitleRef.current?.focus();
  }, [showFull]);

  // "done" is only ever reached by submitting: same reason.
  useEffect(() => {
    if (state === "done") doneRef.current?.focus();
  }, [state]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    // Mirrors the server's checks exactly (route.ts) — anything that
    // passes here can only fail server-side for a reason retrying fixes.
    // That includes its spreadsheet guard: an "address" opening with = + -
    // is refused there, so it is refused here, not answered "try again".
    if (
      new TextEncoder().encode(normalized).length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
      /^[=+\-]/.test(normalized)
    ) {
      setState("invalid");
      return;
    }
    setState("busy");
    try {
      const response = await fetch("/api/founding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const outcome = submitOutcome(response.status);
      if (outcome === "full") {
        // Nothing was saved. The same answer for every address — the
        // page cannot tell, and never says, whether this one was listed.
        focusFullTitle.current = true;
        setState("idle");
        markFull();
        return;
      }
      setState(outcome);
      // The site's one conversion. The event carries no email — GA
      // counts the signup; the address lives only in founding_list.
      if (outcome === "done") trackEvent("founding_signup");
    } catch {
      setState("error");
    }
  };

  if (showFull) {
    const title = t("landing.ctaFullTitle");
    return (
      <>
        {heading ? (
          <h2 ref={keepFullTitle} tabIndex={-1} className="text-base font-semibold focus:outline-none">
            {title}
          </h2>
        ) : (
          <p ref={keepFullTitle} tabIndex={-1} className="text-sm font-semibold focus:outline-none">
            {title}
          </p>
        )}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("landing.ctaFullBody")}</p>
        {/* A full-document navigation into the app, like the header's
            link: the public site's analytics tag must not ride along. */}
        <a
          href="/app"
          // beacon transport: the page unloads right after the click.
          onClick={() => trackEvent("open_app_click", { transport_type: "beacon" })}
          className="inline-flex h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          {t("landing.openApp")}
        </a>
      </>
    );
  }

  return (
    <>
      {heading && (
        <>
          <h2 className="text-base font-semibold">{t("landing.ctaTitle")}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("landing.ctaBody")}</p>
        </>
      )}
      {state === "done" ? (
        <p
          ref={doneRef}
          tabIndex={-1}
          className="rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-3 text-sm font-medium text-emerald-800 focus:outline-none dark:text-emerald-400"
        >
          {t("landing.ctaDone")}
        </p>
      ) : (
        // noValidate: without it the browser's native bubble (in the
        // BROWSER'S language) preempts onSubmit for common typos, so the
        // translated invalid message below never showed for "maria" or
        // "foo@". The regex covers everything the native check did.
        <form ref={formRef} onSubmit={submit} noValidate className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              placeholder={t("landing.ctaPlaceholder")}
              aria-label={t("landing.ctaPlaceholder")}
              aria-describedby={noticeId}
              maxLength={320}
              onChange={(event) => {
                setEmail(event.target.value);
                if (state !== "busy") setState("idle");
              }}
              className="h-11 w-full rounded-md border border-neutral-500 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className="h-11 shrink-0 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
            >
              {t("landing.ctaButton")}
            </button>
          </div>
          {state === "invalid" && (
            <p className="text-sm text-amber-800 dark:text-amber-400">{t("landing.ctaInvalid")}</p>
          )}
          {state === "error" && (
            <p className="text-sm text-red-700 dark:text-red-400">{t("landing.ctaError")}</p>
          )}
          {state === "slow" && (
            <p className="text-sm text-amber-800 dark:text-amber-400">{t("landing.ctaSlow")}</p>
          )}
          {/* Without JS (or with hydration killed by a content filter), the
              submit is HTML's default GET-to-self: the page reloads with the
              field cleared — reads as success, signup silently lost. The
              noscript names a path that works. Prerendered English, like the
              rest of the no-JS page. */}
          <noscript>
            <p className="text-sm text-amber-800 dark:text-amber-400">
              {t("landing.ctaNoScript")}
            </p>
          </noscript>
          <p id={noticeId} className="text-xs text-neutral-600 dark:text-neutral-400">
            {t("landing.ctaFinePrint")}{" "}
            <Link href="/privacy" className="underline">
              {t("landing.footerPrivacy")}
            </Link>
          </p>
        </form>
      )}
    </>
  );
}

/** The form part alone (no title or body), for a page that frames it. */
export function FoundingForm() {
  return (
    <div className="space-y-2">
      <FoundingOffer heading={false} />
    </div>
  );
}

export default function Cta() {
  return (
    <section className="space-y-3 rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <FoundingOffer heading />
    </section>
  );
}
