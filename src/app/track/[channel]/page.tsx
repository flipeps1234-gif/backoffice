import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "../../json-ld";
import { messages as site } from "@/lib/messages/site";
import { breadcrumbs, faqPage, pageMetadata } from "@/lib/seo";
import { CHANNELS, isChannel, type Channel } from "@/lib/site";
import TrackContent from "./track-content";

/**
 * One page per payment channel people search by — the "Venmo
 * bookkeeping" / "track Zelle payments" / "cash income" queries. Each
 * prerenders at build (unknown channel = 404) with its own title,
 * description, keyword cluster, canonical and FAQ structured data.
 * One page owns one cluster; they never compete with each other.
 */

export const generateStaticParams = () =>
  CHANNELS.map((channel) => ({ channel }));
export const dynamicParams = false;

const META: Record<
  Channel,
  { title: string; description: string; keywords: readonly string[] }
> = {
  venmo: {
    title: "Venmo bookkeeping",
    description:
      "No Venmo login, no bank connection: turn Venmo screenshots into real books — business sorted from personal, duplicates caught, a Schedule-C-ready CSV. Free.",
    keywords: [
      "Venmo bookkeeping",
      "track Venmo payments for business",
      "Venmo business transactions",
      "separate business and personal Venmo",
      "Venmo income for taxes",
      "Venmo payment tracker",
    ],
  },
  "cash-app": {
    title: "Cash App bookkeeping",
    description:
      "Screenshot Cash App activity at close and the day is booked in two minutes — business sorted from personal, cash logged beside it, Schedule-C-ready. Free.",
    keywords: [
      "Cash App bookkeeping",
      "track Cash App payments for business",
      "Cash App income for taxes",
      "Cash App payment tracker",
      "cashtag payment records",
      "track cashtag payments",
    ],
  },
  zelle: {
    title: "Zelle payment tracking",
    description:
      "Zelle exports nothing from your bank app. Screenshot your Zelle activity and contado builds the ledger — business sorted from personal, tax-ready. Free.",
    keywords: [
      "Zelle payment tracking",
      "track Zelle payments for business",
      "Zelle business payments record",
      "Zelle income for taxes",
      "Zelle transaction history export",
      "Zelle payment tracker",
    ],
  },
  cash: {
    title: "Cash income tracking",
    description:
      "Track cash income when you're self-employed: log a job in a few taps, keep cash beside Venmo and Cash App income, print proof of income, export a CSV. Free.",
    keywords: [
      "cash income tracker",
      "how to track cash income self-employed",
      "proof of income paid in cash",
      "record cash payments small business",
      "cash income for taxes",
      "self-employed cash log",
    ],
  },
};

/** English FAQ pairs per channel, for FAQPage markup — the same keys
 *  the page renders, so markup and page can't drift. */
const FAQ_EN: Record<Channel, { q: string; a: string }[]> = {
  venmo: [
    { q: site["site.chVenmoFaq1Q"].en, a: site["site.chVenmoFaq1A"].en },
    { q: site["site.chVenmoFaq2Q"].en, a: site["site.chVenmoFaq2A"].en },
    { q: site["site.faqLangQ"].en, a: site["site.faqLangA"].en },
  ],
  "cash-app": [
    { q: site["site.chCashAppFaq1Q"].en, a: site["site.chCashAppFaq1A"].en },
    { q: site["site.chCashAppFaq2Q"].en, a: site["site.chCashAppFaq2A"].en },
    { q: site["site.faqLangQ"].en, a: site["site.faqLangA"].en },
  ],
  zelle: [
    { q: site["site.chZelleFaq1Q"].en, a: site["site.chZelleFaq1A"].en },
    { q: site["site.chZelleFaq2Q"].en, a: site["site.chZelleFaq2A"].en },
    { q: site["site.faqLangQ"].en, a: site["site.faqLangA"].en },
  ],
  cash: [
    { q: site["site.chCashFaq1Q"].en, a: site["site.chCashFaq1A"].en },
    { q: site["site.chCashFaq2Q"].en, a: site["site.chCashFaq2A"].en },
    { q: site["site.faqLangQ"].en, a: site["site.faqLangA"].en },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channel: string }>;
}): Promise<Metadata> {
  const { channel } = await params;
  if (!isChannel(channel)) return {};
  return pageMetadata({ ...META[channel], path: `/track/${channel}` });
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbs([
          { name: META[channel].title, path: `/track/${channel}` },
        ])}
      />
      <JsonLd data={faqPage(FAQ_EN[channel])} />
      <TrackContent channel={channel} />
    </>
  );
}
