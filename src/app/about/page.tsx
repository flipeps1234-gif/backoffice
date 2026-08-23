import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import AboutContent from "./about-content";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Why contado exists: real books for people who clean, mow and cut for a living and get paid through apps and cash. No bank login, no invoicing, no ads.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={organization()} />
      <JsonLd data={breadcrumbs([{ name: "About", path: "/about" }])} />
      <AboutContent />
    </>
  );
}
