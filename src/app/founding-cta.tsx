"use client";

import { useState } from "react";
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
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
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
      setState(response.ok ? "done" : "error");
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
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          placeholder={t("landing.ctaPlaceholder")}
          aria-label={t("landing.ctaPlaceholder")}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state === "invalid" || state === "error") setState("idle");
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
