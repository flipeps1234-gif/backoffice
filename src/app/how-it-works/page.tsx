import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { breadcrumbs, pageMetadata } from "@/lib/seo";
import HowItWorksContent from "./how-it-works-content";

export const metadata: Metadata = pageMetadata({
  title: "How it works",
  description:
    "Screenshot your Venmo, Cash App and Zelle payments, check every row, sort with a swipe — and your books exist. Who owes you, your taxes, all free. No bank login.",
  path: "/how-it-works",
  keywords: [
    "how contado works",
    "screenshot bookkeeping",
    "payment screenshots to ledger",
    "separate business and personal payments",
    "no bank login bookkeeping",
    "track who owes you",
  ],
});

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={breadcrumbs([{ name: "How it works", path: "/how-it-works" }])} />
      <HowItWorksContent />
    </>
  );
}
