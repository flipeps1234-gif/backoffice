"use client";

import Link from "next/link";
import { PublicFooter, PublicHeader } from "../public-shell";
import { useLocale } from "../use-locale";

/**
 * The company page, kept to what is true and checkable: the problem,
 * what contado does about it, the principles the code is held to, and
 * how it is built. No invented team, no invented numbers, no logos.
 */
export default function AboutContent() {
  const { t } = useLocale();
  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8 lg:max-w-5xl">
      <PublicHeader />

      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">{t("site.aboutTitle")}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("site.aboutIntro")}</p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("site.aboutWhat")}</p>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
        <section className="mt-12 space-y-3">
          <h2 className="text-base font-semibold">{t("site.aboutBeliefs")}</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li>{t("landing.law")}</li>
            <li>{t("landing.trustTitle")}</li>
            <li>{t("site.belief3")}</li>
            <li>{t("site.belief4")}</li>
            <li>{t("site.belief5")}</li>
          </ul>
        </section>

        <section className="mt-12 space-y-3">
          <h2 className="text-base font-semibold">{t("site.whatNot")}</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li>{t("site.not1")}</li>
            <li>{t("site.not2")}</li>
            <li>{t("site.not3")}</li>
            <li>{t("site.not4")}</li>
          </ul>
        </section>
      </div>

      <section className="mt-12 max-w-3xl space-y-2">
        <h2 className="text-base font-semibold">{t("site.aboutHow")}</h2>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t("site.aboutHowBody")}</p>
      </section>

      <p className="mt-12 text-sm">
        <Link href="/contact" className="font-medium underline">
          {t("site.aboutTalk")}
        </Link>
      </p>

      <PublicFooter />
    </main>
  );
}
