"use client";

import Link from "next/link";
import { useLocale } from "./use-locale";
import type { MessageKey } from "@/lib/i18n";

/**
 * What makes a keyword page (/for/<trade>, /track/<channel>) more than the
 * homepage with another headline: its own pain points, what contado does
 * about them, its questions, and its sibling pages. The page itself IS the
 * homepage (landing.tsx) — searchers land on the homepage experience, and
 * Google and visitors see the same thing, so there is no redirect to be
 * read as a sneaky one.
 */
export default function KeywordSection({
  pains,
  does,
  faq,
  others,
}: {
  pains: readonly MessageKey[];
  does: readonly MessageKey[];
  faq: readonly { q: MessageKey; a: MessageKey }[];
  others: readonly { href: string; nav: MessageKey }[];
}) {
  const { t } = useLocale();
  return (
    <>
      <div className="mt-14 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("site.tradeSoundFamiliar")}</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            {pains.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>
        <section className="mt-10 space-y-3 lg:mt-0">
          <h2 className="text-base font-semibold">{t("site.tradeWhatItDoes")}</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            {does.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("site.tradeLang")}</p>
        </section>
      </div>

      <section className="mt-14 space-y-4">
        <h2 className="text-base font-semibold">{t("site.commonQuestions")}</h2>
        <dl className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-4 lg:space-y-0">
          {faq.map((pair) => (
            <div key={pair.q}>
              <dt className="text-sm font-medium">{t(pair.q)}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t(pair.a)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-10 text-sm text-neutral-600 dark:text-neutral-400">
        {t("site.tradeOthers")}{" "}
        {others.map((other, index) => (
          <span key={other.href}>
            <Link href={other.href} className="underline">
              {t(other.nav)}
            </Link>
            {index < others.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
    </>
  );
}
