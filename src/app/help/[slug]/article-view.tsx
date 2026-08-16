"use client";

import Link from "next/link";
import type { HelpArticle } from "@/lib/help";
import MarkdownView from "../markdown-view";
import { PublicFooter, PublicHeader } from "../../public-shell";
import { useLocale } from "../../use-locale";

/** One article, all three languages baked in, the device's shown. */
export default function ArticleView({ versions }: { versions: HelpArticle[] }) {
  const { locale, t } = useLocale();
  const article = versions.find((v) => v.locale === locale) ?? versions[0];

  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8">
      <PublicHeader />
      <Link href="/help" className="text-sm text-neutral-500 hover:underline">
        {t("help.back")}
      </Link>
      <h1 className="mt-4 text-lg font-semibold tracking-tight">
        {article.title}
      </h1>
      <div className="mt-4">
        <MarkdownView markdown={article.markdown} />
      </div>
      <PublicFooter />
    </main>
  );
}
