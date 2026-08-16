"use client";

import { useState } from "react";
import Link from "next/link";
import type { HelpArticle } from "@/lib/help";
import { fold } from "@/lib/search";
import { PublicFooter, PublicHeader, TextUs } from "../public-shell";
import { useLocale } from "../use-locale";

/**
 * The public help index: every article in the device's language, with
 * an accent-blind search over titles and bodies — the same fold() the
 * app's global search uses, so "prestamo" finds "préstamo" here too.
 */
export default function HelpIndex({ articles }: { articles: HelpArticle[] }) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");

  const mine = articles.filter((a) => a.locale === locale);
  const needle = fold(query.trim());
  const shown =
    needle === ""
      ? mine
      : mine.filter((a) => fold(`${a.title} ${a.text}`).includes(needle));

  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8">
      <PublicHeader />
      <h1 className="text-lg font-semibold tracking-tight">{t("help.title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("help.intro")}</p>

      <input
        type="search"
        value={query}
        placeholder={t("help.search")}
        aria-label={t("help.search")}
        onChange={(event) => setQuery(event.target.value)}
        className="mt-5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
      />

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">{t("help.noResults")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {shown.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/help/${article.slug}`}
                className="block px-4 py-3 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-neutral-500">
        {t("help.contact")} <TextUs />
      </p>
      <PublicFooter />
    </main>
  );
}
