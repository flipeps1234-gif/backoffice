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

// The fuller disclosure: what we store, who processes it, how long,
// and the visitor's rights. Each section's body may be more than one
// paragraph — this page renders each body key as its own <p>, so a
// section with more to say lists several body keys instead of one
// key holding a "\n\n" the page would otherwise print literally.
const PRIVACY_SECTIONS: [MessageKey, MessageKey, ...MessageKey[]][] = [
  ["site.privacyCollectTitle", "site.privacyCollectBody", "site.privacyCollectBody2"],
  [
    "site.privacyProcessorsTitle",
    "site.privacyProcessorsBody",
    "site.privacyProcessorsBody2",
    "site.privacyProcessorsBody3",
  ],
  ["site.privacyRetentionTitle", "site.privacyRetentionBody", "site.privacyRetentionBody2"],
  ["site.privacyRightsTitle", "site.privacyRightsBody", "site.privacyRightsBody2"],
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
      {/* The one piece of personal data the public SITE itself collects —
          the founding email — disclosed where the promise lives, with the
          way out. The app's terms blocks below can't cover it: the list
          predates any account and survives account deletion on purpose. */}
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {t("site.privacyFounding")}
      </p>

      <div className="mt-8 space-y-6">
        {PRIVACY_SECTIONS.map(([title, ...bodies]) => (
          <section key={title}>
            <h2 className="text-base font-semibold">{t(title)}</h2>
            {bodies.map((body) => (
              <p
                key={body}
                className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
              >
                {t(body)}
              </p>
            ))}
          </section>
        ))}
      </div>

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
