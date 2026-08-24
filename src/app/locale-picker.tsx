"use client";

import { LOCALES, type Locale } from "@/lib/i18n";
import { setLocale } from "@/lib/locale";
import { trackEvent } from "./analytics";
import { useLocale } from "./use-locale";

/**
 * EN · ES · PT. The labels are the language NAMES in themselves — the one
 * string on screen that must never be translated, because the person who
 * needs it is the person who can't read the current language.
 */
const LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

export default function LocalePicker({ compact }: { compact?: boolean }) {
  const { locale, t } = useLocale();
  return (
    <div
      className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}
      role="group"
      aria-label={t("common.language")}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={locale === option}
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            locale === option
              ? "bg-foreground text-background"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          }`}
          onClick={() => {
            setLocale(option);
            // No-op inside /app and without GA armed (analytics.tsx) —
            // on the public site it answers "which language do
            // visitors actually read?"
            trackEvent("language_switch", { language: option });
          }}
        >
          {compact ? option.toUpperCase() : LABELS[option]}
        </button>
      ))}
    </div>
  );
}
