"use client";

import Cta from "../founding-cta";
import { PublicFooter, PublicHeader } from "../public-shell";
import { useLocale } from "../use-locale";
import { FAQ_KEYS } from "@/lib/faq";

export default function FaqContent() {
  const { t } = useLocale();
  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8">
      <PublicHeader />

      <h1 className="text-4xl font-semibold tracking-tight">{t("site.faqTitle")}</h1>
      <p className="mt-3 text-sm text-neutral-500">{t("site.faqIntro")}</p>

      <dl className="mt-10 space-y-6">
        {FAQ_KEYS.map((pair) => (
          <div key={pair.q}>
            <dt className="text-base font-semibold">{t(pair.q)}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t(pair.a)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14">
        <Cta />
      </div>

      <PublicFooter />
    </main>
  );
}
