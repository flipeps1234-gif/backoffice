import type { Metadata } from "next";
import JsonLd from "./json-ld";
import Landing from "./landing";
import { OG_BASE, TW_BASE, organization, softwareApplication } from "@/lib/seo";
import { SITE_NAME, absolute } from "@/lib/site";

/**
 * The public landing page took the root; the app itself lives at /app
 * (see src/app/app/page.tsx). Signed-in visitors are bounced to /app by
 * the Landing component — auth is device-local, so the server can't
 * know; the page renders either way and the bounce is instant.
 *
 * The title is inherited from the root layout's default (no "— contado"
 * suffix on the home page itself); everything else is set here.
 */
const DESCRIPTION =
  "Turn Venmo, Cash App, Zelle and cash into real books, automatically. Built for cleaners, landscapers and barbers. Free.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    ...OG_BASE,
    title: `${SITE_NAME} — your payments, turned into books`,
    description: DESCRIPTION,
    url: absolute("/"),
  },
  twitter: {
    ...TW_BASE,
    title: `${SITE_NAME} — your payments, turned into books`,
    description: DESCRIPTION,
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={organization()} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absolute("/"),
          inLanguage: ["en", "es", "pt-BR"],
        }}
      />
      <JsonLd data={softwareApplication(DESCRIPTION)} />
      <Landing />
    </>
  );
}
