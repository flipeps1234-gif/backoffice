import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { breadcrumbs, pageMetadata, softwareApplication } from "@/lib/seo";
import PricingContent from "./pricing-content";

// The owner's pricing decision (2026-10-08) in one line — the same four
// points as site.pricingIntro, which the page itself renders.
const DESCRIPTION =
  "contado is free during the preview. Current users keep what they use today; paid modules come later, for new users, and the founding price, $6/mo, covers them.";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: DESCRIPTION,
  path: "/pricing",
  keywords: [
    "contado pricing",
    "free bookkeeping app",
    "free ledger app for self-employed",
    "founding hundred",
    "bookkeeping app cost",
  ],
});

export default function PricingPage() {
  return (
    <>
      <JsonLd data={softwareApplication(DESCRIPTION)} />
      <JsonLd data={breadcrumbs([{ name: "Pricing", path: "/pricing" }])} />
      <PricingContent />
    </>
  );
}
