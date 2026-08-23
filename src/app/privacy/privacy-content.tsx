"use client";

import { PublicFooter, PublicHeader } from "../public-shell";
import { useLocale } from "../use-locale";
import type { MessageKey } from "@/lib/i18n";

/**
 * The public privacy page COMPOSES the strings the app already shows —
 * the settings privacy promise and the relevant terms blocks — so the
 * promise a visitor reads here and the one a user accepted in the app
 * can never drift apart. No forked legal copy.
 */

const BLOCKS: [MessageKey, MessageKey][] = [
  ["terms.aiTitle", "terms.aiBody"],
  ["terms.photoTitle", "terms.photoBody"],
  ["terms.othersTitle", "terms.othersBody"],
  ["terms.yoursTitle", "terms.yoursBody"],
  ["terms.deleteTitle", "terms.deleteBody"],
  ["terms.demoTitle", "terms.demoBody"],
];

export default function PrivacyContent() {
  const { t } = useLocale();
  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8">
      <PublicHeader />
      <h1 className="text-lg font-semibold tracking-tight">
        {t("help.privacyTitle")}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{t("help.privacyIntro")}</p>

      <p className="mt-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {t("settings.privacyPromise")}
      </p>
      {/* The website's analytics, disclosed where the promise is made:
          public pages only, never the app, Do Not Track honored — the
          exact behavior of analytics.tsx, stated in plain words. */}
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {t("site.privacyAnalytics")}
      </p>

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
