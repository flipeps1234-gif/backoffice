import type { Locale } from "./i18n";

/**
 * The help center's table of contents. Slugs are stable URLs — renaming
 * one breaks links in the wild, so add, don't rename. Content lives in
 * /help-docs/<locale>/<slug>.md, one file per language, same slug: the
 * single source of truth the public pages AND any future in-app help
 * both render. Never fork help content.
 */

export const HELP_SLUGS = [
  "getting-started",
  "upload-screenshots",
  "owed-and-matching",
  "taxes-and-exports",
  "account-and-privacy",
  "demo-account",
] as const;

export type HelpSlug = (typeof HELP_SLUGS)[number];

export const isHelpSlug = (value: string): value is HelpSlug =>
  (HELP_SLUGS as readonly string[]).includes(value);

/** One article in one language, parsed at build time. */
export type HelpArticle = {
  slug: HelpSlug;
  locale: Locale;
  title: string;
  /** Plain text for search. */
  text: string;
  /** The raw markdown body (title line removed). */
  markdown: string;
};
