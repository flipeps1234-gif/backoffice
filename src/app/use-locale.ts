"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  localeTag,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";
import { currentLocale, subscribeToLocale } from "@/lib/locale";

/**
 * The one hook every screen uses. Server snapshot is "en": the server has
 * no idea what language the device reads, so it renders English and the
 * client re-renders in the right language right after hydration — the
 * same useSyncExternalStore pattern as the terms gate, for the same
 * reason (no hydration mismatch, no flash management by hand).
 */
export const useLocale = (): {
  locale: Locale;
  /** BCP-47 tag for toLocaleDateString and friends. */
  tag: string;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
} => {
  const locale = useSyncExternalStore<Locale>(
    subscribeToLocale,
    currentLocale,
    () => "en",
  );
  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );
  return { locale, tag: localeTag(locale), t };
};
