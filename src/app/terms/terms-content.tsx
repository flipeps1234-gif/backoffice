"use client";

import { PublicFooter, PublicHeader } from "../public-shell";
import { useLocale } from "../use-locale";
import type { MessageKey } from "@/lib/i18n";

/**
 * The public read-only terms page — the SAME nine blocks, in the same
 * order, from the same i18n keys as the in-app terms gate (terms-gate
 * .tsx). One source: if a block changes there, this page changes with
 * it in the same commit, by construction.
 */

const BLOCKS: [MessageKey, MessageKey][] = [
  ["terms.aiTitle", "terms.aiBody"],
  ["terms.photoTitle", "terms.photoBody"],
  ["terms.checkTitle", "terms.checkBody"],
  ["terms.recordTitle", "terms.recordBody"],
  ["terms.othersTitle", "terms.othersBody"],
  ["terms.deleteTitle", "terms.deleteBody"],
  ["terms.demoTitle", "terms.demoBody"],
  ["terms.yoursTitle", "terms.yoursBody"],
  ["terms.earlyTitle", "terms.earlyBody"],
];

export default function TermsContent() {
  const { t } = useLocale();
  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8">
      <PublicHeader />
      <h1 className="text-lg font-semibold tracking-tight">
        {t("terms.title")}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{t("terms.subtitle")}</p>

      <div className="mt-8 space-y-6">
        {BLOCKS.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-base font-semibold">{t(title)}</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {t(body)}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-neutral-500">{t("help.legalNote")}</p>
      <PublicFooter />
    </main>
  );
}
