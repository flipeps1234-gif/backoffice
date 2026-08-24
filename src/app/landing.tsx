"use client";

import { useEffect } from "react";
import Link from "next/link";
import ConfirmationSheet from "./confirmation-sheet";
import Dashboard from "./dashboard";
import DropZone from "./drop-zone";
import Cta from "./founding-cta";
import Insights from "./insights";
import OwedTab from "./owed-tab";
import {
  DemoFrame,
  SHEET_DEMO,
  TOTALS_DEMO,
  noop,
  owedDemo,
  useMounted,
} from "./public-demos";
import { PublicFooter, PublicHeader } from "./public-shell";
import RunningTotals from "./running-totals";
import SwipeDeck from "./swipe-deck";
import { useLocale } from "./use-locale";
import { useSession } from "@/lib/supabase/use-session";
import { EMPTY_PROFILE } from "@/lib/profile";

/**
 * The public landing page — design-tokens.md is the law here: only
 * colors, type and component styles the app already uses, and every
 * illustration is a REAL component fed demo data — never a drawing of
 * one. The set mirrors the audited Ledger Mockups screen for screen:
 * the drop zone (hub), the confirmation sheet, "What we found" + the
 * swipe deck (sorting), the totals bar + Dashboard (your books), and
 * the Owed tab. Nothing here is chrome the app doesn't ship.
 *
 * Copy is trilingual through the same i18n as the app. One CTA
 * (founding-hundred email capture), repeated twice, per spec. The demo
 * fixtures and the CTA live in public-demos.tsx / founding-cta.tsx so
 * the rest of the site shares them.
 */
export default function Landing() {
  const { t } = useLocale();
  const { user } = useSession();
  const mounted = useMounted();

  // Signed in already? This page is a poster on the door — go inside.
  // A full-document navigation, not router.replace: the public site's
  // analytics tag must not ride along into the app.
  useEffect(() => {
    if (user) window.location.replace("/app");
  }, [user]);

  const owed = mounted ? owedDemo() : null;

  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8 lg:max-w-5xl">
      <PublicHeader />

      {/* HERO — on desktop the sheet demo sits beside the words, the way
          the app's own desktop keeps the rail beside the hub. DOM order
          (title → demo → CTA) is unchanged; grid placement does the rest. */}
      <section className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-sm text-neutral-500">{t("landing.heroSub")}</p>
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <DemoFrame label={t("landing.demoData")}>
            <ConfirmationSheet transactions={SHEET_DEMO} onChange={noop} />
          </DemoFrame>
        </div>
        <div className="lg:col-start-1 lg:row-start-2 lg:self-end">
          <Cta />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-14 space-y-6">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500">
          {t("landing.howTitle")}
        </h2>
        <ol className="space-y-8 lg:space-y-12">
          <li className="space-y-3 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:space-y-0">
            <div className="space-y-3">
              <p className="text-base font-semibold">
                <span className="mr-2 tabular-nums text-neutral-500">1</span>
                {t("landing.step1Title")}
              </p>
              <p className="text-sm text-neutral-500">{t("landing.step1Body")}</p>
            </div>
            {/* The hub's real drop zone — the whole box is the tap target;
                there is no separate "choose" button in the app either. */}
            <DemoFrame label={t("landing.demoData")}>
              <DropZone busy={false} onFiles={noop} />
            </DemoFrame>
          </li>
          <li className="space-y-3 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:space-y-0">
            <div className="space-y-3">
              <p className="text-base font-semibold">
                <span className="mr-2 tabular-nums text-neutral-500">2</span>
                {t("landing.step2Title")}
              </p>
              <p className="text-sm text-neutral-500">{t("landing.step2Body")}</p>
            </div>
            {/* The sorting stage exactly as it ships: "What we found" on
                top, then the deck — one card, Personal / Business below. */}
            <DemoFrame label={t("landing.demoData")}>
              <div className="space-y-4">
                <Insights transactions={SHEET_DEMO} />
                <SwipeDeck
                  pending={SHEET_DEMO}
                  onDecide={noop}
                  onUndo={noop}
                  canUndo={false}
                />
              </div>
            </DemoFrame>
          </li>
          <li className="space-y-3 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:space-y-0">
            <div className="space-y-3">
              <p className="text-base font-semibold">
                <span className="mr-2 tabular-nums text-neutral-500">3</span>
                {t("landing.step3Title")}
              </p>
              <p className="text-sm text-neutral-500">{t("landing.step3Body")}</p>
            </div>
            {/* The totals bar and the Dashboard as the desktop rail shows
                them. Dashboard reads today's date for the quarter, so it
                waits for mount like the owed demo does. */}
            <DemoFrame label={t("landing.demoData")}>
              <div className="px-4">
                <RunningTotals transactions={TOTALS_DEMO} />
              </div>
              {mounted && (
                <Dashboard
                  transactions={TOTALS_DEMO}
                  services={[]}
                  sales={[]}
                  clients={[]}
                  templates={[]}
                  profile={EMPTY_PROFILE}
                />
              )}
            </DemoFrame>
          </li>
        </ol>
        <p className="text-sm text-neutral-500">{t("landing.law")}</p>
        <Link href="/how-it-works" className="inline-block text-sm font-medium underline">
          {t("site.navHow")} →
        </Link>
      </section>

      {/* OWED */}
      <section className="mt-14 space-y-4 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:space-y-0">
        <div className="space-y-3">
          <h2 className="text-base font-semibold">{t("landing.owedTitle")}</h2>
          <p className="text-sm text-neutral-500">{t("landing.owedBody")}</p>
        </div>
        {owed && (
          <DemoFrame label={t("landing.demoData")}>
            <OwedTab
              sales={owed.sales}
              clients={owed.clients}
              onMarkCash={noop}
              onMoveToOwed={noop}
              onFindPayment={noop}
              onLogAgain={noop}
            />
          </DemoFrame>
        )}
      </section>

      {/* TAX + TRUST — side by side on desktop, stacked on a phone */}
      <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:gap-12">
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("landing.taxTitle")}</h2>
          <p className="text-sm text-neutral-500">{t("landing.taxBody")}</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("landing.trustTitle")}</h2>
          <ul className="space-y-2 text-sm text-neutral-500">
            <li>{t("landing.trust1")}</li>
            <li>{t("landing.trust2")}</li>
            <li>{t("landing.trust3")}</li>
            <li>{t("landing.trust4")}</li>
          </ul>
          <Link href="/privacy" className="inline-block text-sm font-medium underline">
            {t("landing.trustLink")}
          </Link>
        </section>
      </div>

      {/* CTA, second and last time */}
      <div className="mt-14 lg:mx-auto lg:w-full lg:max-w-[40rem]">
        <Cta />
      </div>

      <PublicFooter />
    </main>
  );
}
