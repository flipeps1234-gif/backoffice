import { readFile } from "node:fs/promises";
import path from "node:path";
import { HELP_SLUGS, type HelpArticle, type HelpSlug } from "@/lib/help";
import { blocksToText, parseMarkdown, splitTitle } from "@/lib/markdown";
import { LOCALES, type Locale } from "@/lib/i18n";

/**
 * Build-time reader for /help-docs. Server-only (node:fs) — the pages
 * that import this are statically rendered, so every article in every
 * language is baked in at build and the runtime never touches disk.
 */

const DOCS = path.join(process.cwd(), "help-docs");

export const loadArticle = async (
  slug: HelpSlug,
  locale: Locale,
): Promise<HelpArticle> => {
  const raw = await readFile(path.join(DOCS, locale, `${slug}.md`), "utf8");
  const blocks = parseMarkdown(raw);
  const { title } = splitTitle(blocks);
  return {
    slug,
    locale,
    title,
    text: blocksToText(blocks),
    // Body without the title line — the page renders the title itself.
    markdown: raw.slice(raw.indexOf("\n") + 1).trim(),
  };
};

/** Every article × every language — a missing file fails the BUILD,
 *  which is exactly when a forgotten translation should surface. */
export const loadAllArticles = async (): Promise<HelpArticle[]> =>
  Promise.all(
    LOCALES.flatMap((locale) =>
      HELP_SLUGS.map((slug) => loadArticle(slug, locale)),
    ),
  );
