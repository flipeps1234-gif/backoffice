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
import { TRADES, type Trade } from "@/lib/site";

/**
 * The trade page body. Copy is keyed per trade; the structure is shared
 * so the three pages say the same kind of thing in the same order —
 * the pain, what contado does about it, one real screen, taxes, the
 * language line, two trade questions plus the language question.
 */

type TradeKeys = {
  title: MessageKey;
  sub: MessageKey;
  pains: readonly MessageKey[];
  does: readonly MessageKey[];
  faq: readonly { q: MessageKey; a: MessageKey }[];
  nav: MessageKey;
};

const KEYS: Record<Trade, TradeKeys> = {
  cleaners: {
    title: "site.cleanersTitle",
    sub: "site.cleanersSub",
    pains: ["site.cleanersPain1", "site.cleanersPain2", "site.cleanersPain3"],
    does: ["site.cleanersDoes1", "site.cleanersDoes2", "site.cleanersDoes3"],
    faq: [
      { q: "site.cleanersFaq1Q", a: "site.cleanersFaq1A" },
      { q: "site.cleanersFaq2Q", a: "site.cleanersFaq2A" },
      { q: "site.faqLangQ", a: "site.faqLangA" },
    ],
    nav: "site.forCleaners",
  },
  landscapers: {
    title: "site.landscapersTitle",
    sub: "site.landscapersSub",
    pains: ["site.landscapersPain1", "site.landscapersPain2", "site.landscapersPain3"],
    does: ["site.landscapersDoes1", "site.landscapersDoes2", "site.landscapersDoes3"],
    faq: [
      { q: "site.landscapersFaq1Q", a: "site.landscapersFaq1A" },
      { q: "site.landscapersFaq2Q", a: "site.landscapersFaq2A" },
      { q: "site.faqLangQ", a: "site.faqLangA" },
    ],
    nav: "site.forLandscapers",
  },
  barbers: {
    title: "site.barbersTitle",
    sub: "site.barbersSub",
    pains: ["site.barbersPain1", "site.barbersPain2", "site.barbersPain3"],
    does: ["site.barbersDoes1", "site.barbersDoes2", "site.barbersDoes3"],
    faq: [
      { q: "site.barbersFaq1Q", a: "site.barbersFaq1A" },
      { q: "site.barbersFaq2Q", a: "site.barbersFaq2A" },
      { q: "site.faqLangQ", a: "site.faqLangA" },
    ],
    nav: "site.forBarbers",
  },
};

/** One real screen per trade — the one its copy leans on. */
function TradeDemo({ trade }: { trade: Trade }) {
  const { t } = useLocale();
  const mounted = useMounted();
  if (trade === "landscapers") {
    return (
      <DemoFrame label={t("landing.demoData")}>
        <ConfirmationSheet transactions={SHEET_DEMO} onChange={noop} />
      </DemoFrame>
    );
  }
  if (trade === "barbers") {
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

export default function TradeContent({ trade }: { trade: Trade }) {
  const { t } = useLocale();
  const keys = KEYS[trade];
  const others = TRADES.filter((other) => other !== trade);

  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8">
      <PublicHeader />

      <h1 className="text-4xl font-semibold tracking-tight">{t(keys.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">{t(keys.sub)}</p>

      <div className="mt-8">
        <Cta />
      </div>

      <section className="mt-14 space-y-3">
        <h2 className="text-base font-semibold">{t("site.tradeSoundFamiliar")}</h2>
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          {keys.pains.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-base font-semibold">{t("site.tradeWhatItDoes")}</h2>
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          {keys.does.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <TradeDemo trade={trade} />
      </section>

      <section className="mt-14 space-y-3">
        <h2 className="text-base font-semibold">{t("landing.taxTitle")}</h2>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("landing.taxBody")}</p>
        <p className="text-sm text-neutral-500">{t("site.tradeLang")}</p>
      </section>

      <section className="mt-14 space-y-4">
        <h2 className="text-base font-semibold">{t("site.commonQuestions")}</h2>
        <dl className="space-y-4">
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
            <Link href={`/for/${other}`} className="underline">
              {t(KEYS[other].nav)}
            </Link>
            {index < others.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>

      <div className="mt-10">
        <Cta />
      </div>

      <PublicFooter />
    </main>
  );
}
