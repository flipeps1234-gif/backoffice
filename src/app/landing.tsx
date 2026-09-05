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
  const mounted = useMounted();

  // Signed in already? This page is a poster on the door — go inside.
  // A full-document navigation, not router.replace: the public site's
  // analytics tag must not ride along into the app.
  //
  // NOT useSession: that hook statically pulls the whole supabase-js SDK
  // (~60KB gz — auth, realtime, websockets) into the landing bundle,
  // which every anonymous visitor pays on the page whose Core Web Vitals
  // decide search ranking. Auth is device-local (the session lives in
  // localStorage under sb-<ref>-auth-token), so the common case — no
  // session — is answerable from localStorage alone; only a visitor who
  // has actually signed in loads the SDK, after hydration, to confirm.
  useEffect(() => {
    // A magic link lands HERE: emailRedirectTo is the bare origin, the only
    // redirect Supabase allows today ("/app" is not in the Redirect URLs).
    // The SDK that consumes #access_token — or #error for an expired link —
    // is constructed on /app, never on this page, and the gate below skips
    // it entirely on a device with no stored session. That is exactly a
    // NEW user's device, so from 2026-08-28 (c993498) until this guard the
    // link verified server-side and then died on the marketing page,
    // signed out. Forward the fragment intact to the page that reads it;
    // a full-document navigation, per the analytics rule.
    if (/[#&](access_token|error|error_code|error_description)=/.test(window.location.hash)) {
      window.location.replace(`/app${window.location.hash}`);
      return;
    }
    // Any other fragment means the visitor asked for THIS page — the app's
    // own brand link points at /#top so a signed-in user can reach the site
    // deliberately. The bounce below is for people who typed the domain.
    if (window.location.hash) return;
    let hasToken = false;
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && /^sb-.*-auth-token$/.test(key)) {
          hasToken = true;
          break;
        }
      }
    } catch {
      return; // storage blocked — treat as signed out
    }
    if (!hasToken) return;
    void import("@/lib/supabase/client").then(async ({ getSupabase }) => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.replace("/app");
    });
  }, []);

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
          {/* Desktop only: the tall sheet demo beside two lines of text
              left the hero's left column mostly air. These are real
              links to the four channel pages — substance, not filler.
              Mobile stays untouched (the lg: law). */}
          <div className="hidden lg:block lg:pt-4">
            <p className="text-sm text-neutral-500">{t("landing.heroChannels")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["/track/venmo", "site.trackVenmo"],
                  ["/track/cash-app", "site.trackCashApp"],
                  ["/track/zelle", "site.trackZelle"],
                  ["/track/cash", "site.trackCash"],
                ] as const
              ).map(([href, key]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex h-11 items-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
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
              {/* Desktop: "What we found" moves under the words so the
                  stacked demo doesn't tower over two lines of text —
                  the tallest void on the page before this. */}
              <div className="hidden lg:block lg:pt-2">
                <DemoFrame label={t("landing.demoData")}>
                  <Insights transactions={SHEET_DEMO} />
                </DemoFrame>
              </div>
            </div>
            {/* The sorting stage exactly as it ships: "What we found" on
                top, then the deck — one card, Personal / Business below.
                On desktop the insights render in the left column instead. */}
            <DemoFrame label={t("landing.demoData")}>
              <div className="space-y-4">
                <div className="lg:hidden">
                  <Insights transactions={SHEET_DEMO} />
                </div>
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
              {/* Desktop: the totals + dashboard demo is the tallest on
                  the page — these carry what the books actually hold. */}
              <ul className="hidden space-y-2 text-sm text-neutral-500 lg:block lg:pt-2">
                <li>{t("landing.step3a")}</li>
                <li>{t("landing.step3b")}</li>
                <li>{t("landing.step3c")}</li>
              </ul>
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
          <ul className="hidden space-y-2 text-sm text-neutral-500 lg:block lg:pt-2">
            <li>{t("landing.owed1")}</li>
            <li>{t("landing.owed2")}</li>
            <li>{t("landing.owed3")}</li>
          </ul>
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
