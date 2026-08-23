import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { breadcrumbs, pageMetadata, softwareApplication } from "@/lib/seo";
import PricingContent from "./pricing-content";

const DESCRIPTION =
  "contado is free while we build — the core stays free forever. Join the founding hundred and lock $6/mo for every paid module, forever.";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: DESCRIPTION,
  path: "/pricing",
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
