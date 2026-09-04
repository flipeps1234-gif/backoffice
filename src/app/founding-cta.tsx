"use client";

import { useState } from "react";
import { trackEvent } from "./analytics";
import { useLocale } from "./use-locale";

/**
 * The one call to action on the public site: the founding-hundred email
 * capture. Shared by the landing, pricing, the trade pages and contact
 * so the offer reads identically everywhere. Posts to /api/founding
 * (rate-limited; duplicates return ok — no enumeration).
 */
export function FoundingForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error" | "slow">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    // Mirrors the server's checks exactly (route.ts) — anything that
    // passes here can only fail server-side for a reason retrying fixes.
    if (
      new TextEncoder().encode(normalized).length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
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
      // 429 means "wait", not "retry now" — the generic error message
      // would tell a rate-limited visitor to do exactly the wrong thing.
      setState(response.ok ? "done" : response.status === 429 ? "slow" : "error");
      // The site's one conversion. The event carries no email — GA
      // counts the signup; the address lives only in founding_list.
      if (response.ok) trackEvent("founding_signup");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        {t("landing.ctaDone")}
      </p>
    );
  }

  return (
    // noValidate: without it the browser's native bubble (in the
    // BROWSER'S language) preempts onSubmit for common typos, so the
    // translated invalid message below never showed for "maria" or
    // "foo@". The regex covers everything the native check did.
    <form onSubmit={submit} noValidate className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          placeholder={t("landing.ctaPlaceholder")}
          aria-label={t("landing.ctaPlaceholder")}
          maxLength={320}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state !== "busy") setState("idle");
          }}
          className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="h-11 shrink-0 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("landing.ctaButton")}
        </button>
      </div>
      {state === "invalid" && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("landing.ctaInvalid")}</p>
      )}
      {state === "error" && (
        <p className="text-sm text-red-700 dark:text-red-400">{t("landing.ctaError")}</p>
      )}
      {state === "slow" && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("landing.ctaSlow")}</p>
      )}
      {/* Without JS (or with hydration killed by a content filter), the
          submit is HTML's default GET-to-self: the page reloads with the
          field cleared — reads as success, signup silently lost. The
          noscript names a path that works. Prerendered English, like the
          rest of the no-JS page. */}
      <noscript>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t("landing.ctaNoScript")}
        </p>
      </noscript>
    </form>
  );
}

export default function Cta() {
  const { t } = useLocale();
  return (
    <section className="space-y-3 rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-base font-semibold">{t("landing.ctaTitle")}</h2>
      <p className="text-sm text-neutral-500">{t("landing.ctaBody")}</p>
      <FoundingForm />
    </section>
  );
}
