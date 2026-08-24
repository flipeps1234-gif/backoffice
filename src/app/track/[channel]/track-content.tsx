"use client";

import Link from "next/link";
import ConfirmationSheet from "../../confirmation-sheet";
import Dashboard from "../../dashboard";
import Cta from "../../founding-cta";
import OwedTab from "../../owed-tab";
import {
  DemoFrame,
  SHEET_DEMO,
  TOTALS_DEMO,
  noop,
  owedDemo,
  useMounted,
} from "../../public-demos";
import { PublicFooter, PublicHeader } from "../../public-shell";
import RunningTotals from "../../running-totals";
import { useLocale } from "../../use-locale";
import type { MessageKey } from "@/lib/i18n";
import { EMPTY_PROFILE } from "@/lib/profile";
import { CHANNELS, type Channel } from "@/lib/site";

/**
 * The channel page body — same shared structure as the trade pages
 * (the pain, what contado does, one real screen, taxes, questions), so
 * the site says the same kind of thing in the same order everywhere.
 */

type ChannelKeys = {
  title: MessageKey;
  sub: MessageKey;
  pains: readonly MessageKey[];
  does: readonly MessageKey[];
  faq: readonly { q: MessageKey; a: MessageKey }[];
  nav: MessageKey;
};

const KEYS: Record<Channel, ChannelKeys> = {
  venmo: {
    title: "site.chVenmoTitle",
    sub: "site.chVenmoSub",
    pains: ["site.chVenmoPain1", "site.chVenmoPain2", "site.chVenmoPain3"],
    does: ["site.chVenmoDoes1", "site.chVenmoDoes2", "site.chVenmoDoes3"],
    faq: [
      { q: "site.chVenmoFaq1Q", a: "site.chVenmoFaq1A" },
      { q: "site.chVenmoFaq2Q", a: "site.chVenmoFaq2A" },
      { q: "site.faqLangQ", a: "site.faqLangA" },
    ],
    nav: "site.trackVenmo",
  },
  "cash-app": {
    title: "site.chCashAppTitle",
    sub: "site.chCashAppSub",
    pains: ["site.chCashAppPain1", "site.chCashAppPain2", "site.chCashAppPain3"],
    does: ["site.chCashAppDoes1", "site.chCashAppDoes2", "site.chCashAppDoes3"],
    faq: [
      { q: "site.chCashAppFaq1Q", a: "site.chCashAppFaq1A" },
      { q: "site.chCashAppFaq2Q", a: "site.chCashAppFaq2A" },
      { q: "site.faqLangQ", a: "site.faqLangA" },
    ],
    nav: "site.trackCashApp",
  },
  zelle: {
    title: "site.chZelleTitle",
    sub: "site.chZelleSub",
    pains: ["site.chZellePain1", "site.chZellePain2", "site.chZellePain3"],
    does: ["site.chZelleDoes1", "site.chZelleDoes2", "site.chZelleDoes3"],
    faq: [
      { q: "site.chZelleFaq1Q", a: "site.chZelleFaq1A" },
      { q: "site.chZelleFaq2Q", a: "site.chZelleFaq2A" },
      { q: "site.faqLangQ", a: "site.faqLangA" },
    ],
    nav: "site.trackZelle",
  },
  cash: {
    title: "site.chCashTitle",
    sub: "site.chCashSub",
    pains: ["site.chCashPain1", "site.chCashPain2", "site.chCashPain3"],
    does: ["site.chCashDoes1", "site.chCashDoes2", "site.chCashDoes3"],
    faq: [
      { q: "site.chCashFaq1Q", a: "site.chCashFaq1A" },
      { q: "site.chCashFaq2Q", a: "site.chCashFaq2A" },
      { q: "site.faqLangQ", a: "site.faqLangA" },
    ],
    nav: "site.trackCash",
  },
};

/** One real screen per channel — the one its copy leans on. */
function ChannelDemo({ channel }: { channel: Channel }) {
  const { t } = useLocale();
  const mounted = useMounted();
  if (channel === "venmo") {
    return (
      <DemoFrame label={t("landing.demoData")}>
        <ConfirmationSheet transactions={SHEET_DEMO} onChange={noop} />
      </DemoFrame>
    );
  }
  if (channel === "cash-app" || channel === "cash") {
    return (
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
    );
  }
  if (!mounted) return null;
  const owed = owedDemo();
  return (
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
  );
}

export default function TrackContent({ channel }: { channel: Channel }) {
  const { t } = useLocale();
  const keys = KEYS[channel];
  const others = CHANNELS.filter((other) => other !== channel);

  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8 lg:max-w-5xl">
      <PublicHeader />

      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">{t(keys.title)}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-500">{t(keys.sub)}</p>

      <div className="mt-8 lg:max-w-[40rem]">
        <Cta />
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
        <section className="mt-14 space-y-3 lg:mt-12">
          <h2 className="text-base font-semibold">{t("site.tradeSoundFamiliar")}</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            {keys.pains.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 space-y-4 lg:mt-12">
          <h2 className="text-base font-semibold">{t("site.tradeWhatItDoes")}</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            {keys.does.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-8">
        <ChannelDemo channel={channel} />
      </div>

      <section className="mt-14 space-y-3 lg:max-w-3xl">
        <h2 className="text-base font-semibold">{t("landing.taxTitle")}</h2>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("landing.taxBody")}</p>
        <p className="text-sm text-neutral-500">{t("site.tradeLang")}</p>
      </section>

      <section className="mt-14 space-y-4">
        <h2 className="text-base font-semibold">{t("site.commonQuestions")}</h2>
        <dl className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-4 lg:space-y-0">
          {keys.faq.map((pair) => (
            <div key={pair.q}>
              <dt className="text-sm font-medium">{t(pair.q)}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t(pair.a)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-10 text-sm text-neutral-500">
        {t("site.tradeOthers")}{" "}
        {others.map((other, index) => (
          <span key={other}>
            <Link href={`/track/${other}`} className="underline">
              {t(KEYS[other].nav)}
            </Link>
            {index < others.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>

      <div className="mt-10 lg:mx-auto lg:w-full lg:max-w-[40rem]">
        <Cta />
      </div>

      <PublicFooter />
    </main>
  );
}
