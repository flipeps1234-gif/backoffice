/**
 * The public website's identity, in one place.
 *
 * SITE_URL is the canonical origin every absolute URL on the site is built
 * from — metadataBase, canonicals, the sitemap, robots, JSON-LD. It reads
 * NEXT_PUBLIC_SITE_URL first (NEXT_PUBLIC_* is inlined at build — see
 * DEPLOY.md); the fallback is the real domain, getcontado.com, which went
 * primary on Vercel on 2026-08-22 — the *.vercel.app origin now 307s to
 * it, and a canonical that redirects is an SEO defect, so the fallback
 * must be the domain, not the Vercel URL.
 *
 * Pure constants and tiny helpers; no DOM, no React — the site map below
 * feeds sitemap.ts, the footer and the breadcrumbs alike, so they can't
 * drift apart.
 */

export const SITE_NAME = "contado";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://getcontado.com"
).replace(/\/+$/, "");

/** Absolute URL for a site-relative path. */
export const absolute = (path: string): string =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** The three trades the product is built for — each gets a public page.
 *  Slugs are URLs: add, don't rename. */
export const TRADES = ["cleaners", "landscapers", "barbers"] as const;
export type Trade = (typeof TRADES)[number];
export const isTrade = (value: string): value is Trade =>
  (TRADES as readonly string[]).includes(value);

/** The payment channels people search by — each gets a public page
 *  (/track/<channel>). Same rule: slugs are URLs, add don't rename. */
export const CHANNELS = ["venmo", "cash-app", "zelle", "cash"] as const;
export type Channel = (typeof CHANNELS)[number];
export const isChannel = (value: string): value is Channel =>
  (CHANNELS as readonly string[]).includes(value);

/** Every public page that belongs in the sitemap, with crawl hints.
 *  /help/[slug] is appended by sitemap.ts from HELP_SLUGS. The app
 *  (/app) is deliberately absent — it is a sign-in gate, not content,
 *  and robots.ts disallows it. */
export const PUBLIC_PAGES: readonly {
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  ...TRADES.map((trade) => ({
    path: `/for/${trade}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  ...CHANNELS.map((channel) => ({
    path: `/track/${channel}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  { path: "/help", changeFrequency: "weekly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
];
