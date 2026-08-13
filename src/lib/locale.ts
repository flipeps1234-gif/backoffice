import type { Locale } from "./i18n";

/**
 * Which language this device reads. Same storage posture as terms.ts:
 * per device (a borrowed phone should not inherit someone else's
 * language), in-memory fallback for private browsing, storage event so
 * two tabs agree.
 *
 * Until the user picks explicitly, the browser's language decides —
 * a phone already set to Spanish should not open in English and hide
 * the switcher behind English labels.
 */
const KEY = "contado.locale";

const isLocale = (v: unknown): v is Locale =>
  v === "en" || v === "es" || v === "pt";

const detect = (): Locale => {
  if (typeof navigator === "undefined") return "en";
  const lang = (navigator.language ?? "").toLowerCase();
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("pt")) return "pt";
  return "en";
};

let inMemory: Locale | null = null;
let storageUsable = true;

const listeners = new Set<() => void>();

export const currentLocale = (): Locale => {
  if (storageUsable) {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (isLocale(stored)) return stored;
    } catch {
      storageUsable = false;
    }
  }
  return inMemory ?? detect();
};

export const setLocale = (locale: Locale): void => {
  inMemory = locale;
  try {
    window.localStorage.setItem(KEY, locale);
  } catch {
    storageUsable = false;
  }
  for (const notify of [...listeners]) notify();
};

export const subscribeToLocale = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};
