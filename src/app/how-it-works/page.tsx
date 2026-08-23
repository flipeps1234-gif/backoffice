import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { breadcrumbs, pageMetadata } from "@/lib/seo";
import HowItWorksContent from "./how-it-works-content";

export const metadata: Metadata = pageMetadata({
  title: "How it works",
  description:
    "Screenshot your Venmo, Cash App and Zelle payments, check every row, sort with a swipe — and your books exist. Who owes you, your taxes, all free.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={breadcrumbs([{ name: "How it works", path: "/how-it-works" }])} />
      <HowItWorksContent />
    </>
  );
}
