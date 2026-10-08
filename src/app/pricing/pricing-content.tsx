"use client";

import Cta from "../founding-cta";
import { PublicPage } from "../public-shell";
import { useLocale } from "../use-locale";

/**
 * Pricing, honestly — the owner's decision of 2026-10-08: everything is
 * free during the preview; current users keep what they use today; paid
 * modules come later, for new users; the founding members' one price
 * covers the modules. Under it, the core that no module will ever hold
 * (free forever, for everyone). No billing code exists and none is
 * implied — this page describes the promise, not a checkout (CLAUDE.md:
 * build NO billing). Bundle-first, as specified.
 */
export default function PricingContent() {
  const { t } = useLocale();
  return (
    <PublicPage className="mx-auto w-full max-w-[40rem] px-4 py-8 lg:max-w-5xl">
      <h1 className="text-4xl font-semibold tracking-tight">{t("site.pricingTitle")}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("site.pricingIntro")}</p>

      {/* Desktop: a 2×2 — free-forever beside the founding CTA, the
          future modules beside the rule we charge by. Mobile keeps the
          original stacked order and rhythm (each cell's own mt). */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
        <section className="mt-10 space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{t("site.freeForever")}</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li>{t("site.free1")}</li>
            <li>{t("site.free2")}</li>
            <li>{t("site.free3")}</li>
            <li>{t("site.free4")}</li>
            <li>{t("site.free5")}</li>
          </ul>
        </section>

        <div className="mt-10">
          <Cta />
        </div>

        <section className="mt-14 space-y-3 lg:mt-12">
          <h2 className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{t("site.laterTitle")}</h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("site.laterIntro")}</p>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li>{t("site.modAutopilot")}</li>
            <li>{t("site.modAlerts")}</li>
            <li>{t("site.modInsights")}</li>
            <li>{t("site.modTime")}</li>
          </ul>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("site.laterNote")}</p>
        </section>

        <section className="mt-14 space-y-2 lg:mt-12">
          <h2 className="text-base font-semibold">{t("site.filterTitle")}</h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("site.filterBody")}</p>
        </section>
      </div>
    </PublicPage>
  );
}
