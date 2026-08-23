import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "../../json-ld";
import { messages as site } from "@/lib/messages/site";
import { breadcrumbs, faqPage, pageMetadata } from "@/lib/seo";
import { TRADES, isTrade, type Trade } from "@/lib/site";
import TradeContent from "./trade-content";

/**
 * One page per trade the product is built for. Each prerenders at build
 * (an unknown trade is a plain 404) with its own title, description,
 * canonical and FAQ structured data — the English prerender is what a
 * crawler reads; the client re-renders in the device language.
 */

export const generateStaticParams = () => TRADES.map((trade) => ({ trade }));
export const dynamicParams = false;

const META: Record<Trade, { title: string; description: string }> = {
  cleaners: {
    title: "Bookkeeping for house cleaners",
    description:
      "Turn Venmo, Cash App, Zelle and cash into real books from the driveway. Track who owes you, tag supplies for Schedule C, export for your tax preparer. Free.",
  },
  landscapers: {
    title: "Bookkeeping for landscapers",
    description:
      "Payments from the truck, one hand: Venmo, Cash App, Zelle and cash into real books. Recurring monthly accounts, who owes you, a mileage estimate, Schedule C. Free.",
  },
  barbers: {
    title: "Bookkeeping for barbers",
    description:
      "Cash App and cash days in the same books, two minutes at close. Who still owes you, chair rent and product tagged for Schedule C. Free.",
  },
};

/** English FAQ pairs per trade, for FAQPage markup. */
const FAQ_EN: Record<Trade, { q: string; a: string }[]> = {
  cleaners: [
    { q: site["site.cleanersFaq1Q"].en, a: site["site.cleanersFaq1A"].en },
    { q: site["site.cleanersFaq2Q"].en, a: site["site.cleanersFaq2A"].en },
    { q: site["site.faqLangQ"].en, a: site["site.faqLangA"].en },
  ],
  landscapers: [
    { q: site["site.landscapersFaq1Q"].en, a: site["site.landscapersFaq1A"].en },
    { q: site["site.landscapersFaq2Q"].en, a: site["site.landscapersFaq2A"].en },
    { q: site["site.faqLangQ"].en, a: site["site.faqLangA"].en },
  ],
  barbers: [
    { q: site["site.barbersFaq1Q"].en, a: site["site.barbersFaq1A"].en },
    { q: site["site.barbersFaq2Q"].en, a: site["site.barbersFaq2A"].en },
    { q: site["site.faqLangQ"].en, a: site["site.faqLangA"].en },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trade: string }>;
}): Promise<Metadata> {
  const { trade } = await params;
  if (!isTrade(trade)) return {};
  return pageMetadata({ ...META[trade], path: `/for/${trade}` });
}

export default async function TradePage({
  params,
}: {
  params: Promise<{ trade: string }>;
}) {
  const { trade } = await params;
  if (!isTrade(trade)) notFound();
  return (
    <>
      <JsonLd data={breadcrumbs([{ name: META[trade].title, path: `/for/${trade}` }])} />
      <JsonLd data={faqPage(FAQ_EN[trade])} />
      <TradeContent trade={trade} />
    </>
  );
}
