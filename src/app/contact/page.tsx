import type { Metadata } from "next";
import JsonLd from "../json-ld";
import { breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import ContactContent from "./contact-content";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Talk to contado — text us, email us, or find the answer in the help center.",
  path: "/contact",
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
