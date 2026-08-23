import type { Metadata } from "next";
import { SITE_NAME, absolute } from "./site";

/**
 * One helper for every public page's <head>: title (the root layout
 * appends " — contado"), description, a canonical URL, and the share
 * card fields. Server-safe, no React. Pages pass the English copy — the
 * prerender is English and crawlers read that; the client re-renders the
 * visible page in the device language without touching these tags.
 */
export const pageMetadata = ({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata => ({
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    title: `${title} — ${SITE_NAME}`,
    description,
    url: absolute(path),
  },
  twitter: { title: `${title} — ${SITE_NAME}`, description },
});

/** BreadcrumbList for a page one level under home. */
export const breadcrumbs = (
  trail: readonly { name: string; path: string }[],
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ name: SITE_NAME, path: "/" }, ...trail].map(
    (crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    }),
  ),
});

/** The organization, once, for the pages that describe the company. */
export const organization = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: absolute("/"),
  logo: absolute("/icon.svg"),
});

/** The product itself. Free — and the price says so in the markup. */
export const softwareApplication = (
  description: string,
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: absolute("/"),
  description,
  inLanguage: ["en", "es", "pt-BR"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
});

/** FAQPage from plain question/answer pairs (English, the prerender). */
export const faqPage = (
  pairs: readonly { q: string; a: string }[],
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: pairs.map((pair) => ({
    "@type": "Question",
    name: pair.q,
    acceptedAnswer: { "@type": "Answer", text: pair.a },
  })),
});
