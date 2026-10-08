import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import ContactContent from "./contact-content";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  // Texting is "coming soon" on the page itself, so the description
  // names only what exists.
  description: "Talk to contado — email us, or find the answer in the help center.",
  path: "/contact",
  keywords: ["contact contado", "contado support", "getcontado help"],
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={organization()} />
      <JsonLd data={breadcrumbs([{ name: "Contact", path: "/contact" }])} />
      <ContactContent />
    </>
  );
}
