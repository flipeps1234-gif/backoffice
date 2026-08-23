import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HELP_SLUGS, isHelpSlug } from "@/lib/help";
import { LOCALES } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import ArticleView from "./article-view";
import { loadArticle } from "../load";

/** Every article prerenders at build; an unknown slug is a plain 404. */
export const generateStaticParams = () =>
  HELP_SLUGS.map((slug) => ({ slug }));

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isHelpSlug(slug)) return {};
  const article = await loadArticle(slug, "en");
  // The root layout appends " — contado"; the canonical keeps each
  // article's URL unambiguous for crawlers.
  return pageMetadata({
    title: article.title,
    description: article.text.slice(0, 150),
    path: `/help/${slug}`,
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isHelpSlug(slug)) notFound();
  const versions = await Promise.all(
    LOCALES.map((locale) => loadArticle(slug, locale)),
  );
  return <ArticleView versions={versions} />;
}
