"use client";

import KeywordSection from "../../keyword-section";
import Landing from "../../landing";
import { useLocale } from "../../use-locale";
import type { MessageKey } from "@/lib/i18n";
import { CHANNELS, type Channel } from "@/lib/site";

/**
 * A channel page: the homepage (landing.tsx) with the channel's own
 * headline and section — see the trade pages (2026-10-07).
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

export default function TrackContent({ channel }: { channel: Channel }) {
  const { t } = useLocale();
  const keys = KEYS[channel];
  return (
    <Landing
      entry={false}
      hero={{ title: t(keys.title), sub: t(keys.sub) }}
      extra={
        <KeywordSection
          pains={keys.pains}
          does={keys.does}
          faq={keys.faq}
          others={CHANNELS.filter((other) => other !== channel).map((other) => ({
            href: `/track/${other}`,
            nav: KEYS[other].nav,
          }))}
        />
      }
    />
  );
}
