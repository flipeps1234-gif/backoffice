"use client";

import ConfirmationSheet from "../confirmation-sheet";
import Dashboard from "../dashboard";
import DropZone from "../drop-zone";
import Cta from "../founding-cta";
import Insights from "../insights";
import OwedTab from "../owed-tab";
import {
  DemoFrame,
  SHEET_DEMO,
  TOTALS_DEMO,
  noop,
  owedDemo,
  useMounted,
} from "../public-demos";
import { PublicFooter, PublicHeader } from "../public-shell";
import RunningTotals from "../running-totals";
import SwipeDeck from "../swipe-deck";
import { useLocale } from "../use-locale";
import type { MessageKey } from "@/lib/i18n";
import { EMPTY_PROFILE } from "@/lib/profile";

/**
 * The long-form walkthrough the landing page summarizes: every stage of
 * the product, each illustrated by the REAL component it describes.
 * Same rule as everywhere on the public surface — nothing drawn, only
 * shipped screens fed demo data.
 */

function Step({
  n,
  title,
  detail,
  children,
}: {
  n: number;
  title: MessageKey;
  detail: MessageKey;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <li className="space-y-3 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:space-y-0">
      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          <span className="mr-2 tabular-nums text-neutral-500">{n}</span>
          {t(title)}
        </h2>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {t(detail)}
        </p>
      </div>
      <DemoFrame label={t("landing.demoData")}>{children}</DemoFrame>
    </li>
  );
}

export default function HowItWorksContent() {
  const { t } = useLocale();
  const mounted = useMounted();
  const owed = mounted ? owedDemo() : null;

  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8 lg:max-w-5xl">
      <PublicHeader />

      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">{t("site.howTitle")}</h1>
      <p className="mt-3 text-sm text-neutral-500">{t("site.howIntro")}</p>

      <ol className="mt-10 space-y-10 lg:space-y-12">
        <Step n={1} title="landing.step1Title" detail="site.how1Detail">
          <DropZone busy={false} onFiles={noop} />
        </Step>
        <Step n={2} title="site.how2Title" detail="site.how2Detail">
          <ConfirmationSheet transactions={SHEET_DEMO} onChange={noop} />
        </Step>
        <Step n={3} title="site.how3Title" detail="site.how3Detail">
          <div className="space-y-4">
            <Insights transactions={SHEET_DEMO} />
            <SwipeDeck pending={SHEET_DEMO} onDecide={noop} onUndo={noop} canUndo={false} />
          </div>
        </Step>
        <Step n={4} title="landing.step3Title" detail="site.how4Detail">
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
        </Step>
        <li className="space-y-3 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:space-y-0">
          <div className="space-y-3">
            <h2 className="text-base font-semibold">
              <span className="mr-2 tabular-nums text-neutral-500">5</span>
              {t("landing.owedTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {t("site.how5Detail")}
            </p>
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
        </li>
        <li className="space-y-3 lg:max-w-3xl">
          <h2 className="text-base font-semibold">
            <span className="mr-2 tabular-nums text-neutral-500">6</span>
            {t("landing.taxTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {t("landing.taxBody")}
          </p>
        </li>
      </ol>

      <p className="mt-10 text-sm text-neutral-500">{t("landing.law")}</p>

      <section className="mt-14 space-y-3">
        <h2 className="text-base font-semibold">{t("site.whatNot")}</h2>
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-2 lg:space-y-0">
          <li>{t("site.not1")}</li>
          <li>{t("site.not2")}</li>
          <li>{t("site.not3")}</li>
          <li>{t("site.not4")}</li>
        </ul>
      </section>

      <div className="mt-14 lg:mx-auto lg:w-full lg:max-w-[40rem]">
        <Cta />
      </div>

      <PublicFooter />
    </main>
  );
}
