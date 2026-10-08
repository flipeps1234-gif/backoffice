"use client";

import KeywordSection from "../../keyword-section";
import Landing from "../../landing";
import { useLocale } from "../../use-locale";
import type { MessageKey } from "@/lib/i18n";
import { TRADES, type Trade } from "@/lib/site";

/**
 * A trade page: the homepage (landing.tsx) with the trade's own headline
 * and section. It used to be a page of its own; the owner wants searchers
 * to land on the homepage experience, and this does that without a
 * redirect — Google and visitors see the same page (2026-10-07).
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

export default function TradeContent({ trade }: { trade: Trade }) {
  const { t } = useLocale();
  const keys = KEYS[trade];
  return (
    <Landing
      entry={false}
      hero={{ title: t(keys.title), sub: t(keys.sub) }}
      extra={
        <KeywordSection
          pains={keys.pains}
          does={keys.does}
          faq={keys.faq}
          others={TRADES.filter((other) => other !== trade).map((other) => ({
            href: `/for/${other}`,
            nav: KEYS[other].nav,
          }))}
        />
      }
    />
  );
}
