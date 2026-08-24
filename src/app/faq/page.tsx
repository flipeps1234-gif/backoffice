import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { FAQ_KEYS } from "@/lib/faq";
import { messages as site } from "@/lib/messages/site";
import { breadcrumbs, faqPage, pageMetadata } from "@/lib/seo";
import FaqContent from "./faq-content";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  description:
    "Plain answers: is contado free, which payment apps work, no bank login, what happens to screenshots, how to track who owes you, proof of cash income, taxes, export and delete.",
  path: "/faq",
  // Branded/question intent only — the answer-shaped clusters (owed
  // tracker, cash proof of income, Venmo separation) belong to the
  // /track pages that own them.
  keywords: [
    "contado faq",
    "is contado free",
    "contado questions",
    "contado demo account",
    "bookkeeping app faq",
  ],
});

export default function FaqPage() {
  // The English pairs are what the prerender shows and what a crawler
  // reads — the same source the page renders from, so they can't drift.
  const pairs = FAQ_KEYS.map((pair) => ({ q: site[pair.q].en, a: site[pair.a].en }));
  return (
    <>
      <JsonLd data={faqPage(pairs)} />
      <JsonLd data={breadcrumbs([{ name: "FAQ", path: "/faq" }])} />
      <FaqContent />
    </>
  );
}
