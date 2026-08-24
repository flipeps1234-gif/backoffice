import type { Metadata } from "next";
import { SITE_NAME, absolute } from "./site";

/**
 * One helper for every public page's <head>: title (the root layout
 * appends " — contado"), description, a canonical URL, and the share
 * card fields. Server-safe, no React. Pages pass the English copy — the
 * prerender is English and crawlers read that; the client re-renders the
 * visible page in the device language without touching these tags.
 *
 * Next does NOT deep-merge nested metadata objects: a page that sets
 * `openGraph` or `twitter` REPLACES the root layout's object, including
 * the root opengraph-image. So the share-card base lives here, once,
 * and is spread into every page-level object (review catch — every
 * subpage was shipping an imageless small card).
 */

export const OG_IMAGE_ALT = `${SITE_NAME} — your payments, turned into books`;

export const OG_BASE: NonNullable<Metadata["openGraph"]> = {
  type: "website",
  siteName: SITE_NAME,
  locale: "en_US",
  alternateLocale: ["es_419", "pt_BR"],
  images: [
    { url: "/opengraph-image", width: 1200, height: 630, alt: OG_IMAGE_ALT },
  ],
};

export const TW_BASE: NonNullable<Metadata["twitter"]> = {
  card: "summary_large_image",
  images: ["/opengraph-image"],
};

export const pageMetadata = ({
  title,
  description,
  path,
  keywords,
}: {
  title: string;
  description: string;
  path: string;
  /** The keyword cluster this page owns — one page per cluster, so
   *  pages never compete with each other for the same query. */
  keywords?: readonly string[];
}): Metadata => ({
  title,
  description,
  ...(keywords ? { keywords: [...keywords] } : {}),
  alternates: { canonical: path },
  openGraph: {
    ...OG_BASE,
    title: `${title} — ${SITE_NAME}`,
    description,
    url: absolute(path),
  },
  twitter: { ...TW_BASE, title: `${title} — ${SITE_NAME}`, description },
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

/** The organization, once, for the pages that describe the company.
 *  alternateName carries the domain-shaped brand query ("getcontado"). */
export const organization = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  alternateName: ["getcontado", "contado app"],
  url: absolute("/"),
  logo: absolute("/icon.svg"),
});

/** The product itself. Free — and the price says so in the markup.
 *  featureList states, in query-shaped words, only what ships. */
export const softwareApplication = (
  description: string,
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  alternateName: "getcontado",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: absolute("/"),
  description,
  inLanguage: ["en", "es", "pt-BR"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Read Venmo, Cash App and Zelle payment screenshots into a ledger",
    "Log cash income in a few taps, built for one hand",
    "Separate business from personal payments with a swipe",
    "Track who owes you, grouped by client and aged",
    "Schedule C expense categories on receipts",
    "Mileage estimate from client distances — no GPS",
    "Proof of income as print or PDF",
    "CSV export for your tax preparer, free forever",
    "English, Spanish and Portuguese",
  ],
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

/**
 * A meta description from a markdown body: the first real paragraph,
 * inline marks stripped, cut at a word boundary. Never the title (that
 * is already the <title>) and never a mid-word slice.
 */
export const describeMarkdown = (markdown: string, max = 155): string => {
  const paragraph =
    markdown
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith("#") && !block.startsWith("-")) ?? "";
  const plain = paragraph
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > 40 ? cut.slice(0, atWord) : cut).replace(/[,;:—-]+$/, "")}…`;
};
