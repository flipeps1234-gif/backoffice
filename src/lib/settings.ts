/**
 * Device settings — v0.6.6. Same storage posture as locale.ts and
 * terms.ts: per device (theme and language describe THIS screen and
 * THIS reader, not the account), localStorage with an in-memory
 * fallback for private browsing, storage events so two tabs agree.
 *
 * The sale-flow order is per-device too, by the boring-wins rule: an
 * account-level setting needs a table, a migration and a sync story
 * for a preference the owner sets once on the phone they always use.
 * Revisit only if multi-device becomes real.
 */

export type Theme = "system" | "light" | "dark";
/** Which way the NEW SALE flow runs — the v0.5 parked decision, unparked. */
export type SaleFlowOrder = "products-first" | "client-first";

// The theme KEY and its resolution are mirrored by the pre-paint inline
// script in layout.tsx — change one, change both.
const THEME_KEY = "contado.theme";
const FLOW_KEY = "contado.saleflow";
// In-app notices (v0.6.7). These are NOT push notifications — no
// scheduling infra exists and the boundary stands. They gate two
// banners the app shows on open: last month's recap, and a
// January–mid-April tax-season pointer. On by default.
const NOTIFY_RECAP_KEY = "contado.notify.recap";
const NOTIFY_TAX_KEY = "contado.notify.tax";
// Markers so a banner shows once, not forever.
const RECAP_SHOWN_KEY = "contado.recap.shown";
const TAX_DISMISSED_KEY = "contado.taxnote.dismissed";

const isTheme = (v: unknown): v is Theme =>
  v === "system" || v === "light" || v === "dark";
const isFlow = (v: unknown): v is SaleFlowOrder =>
  v === "products-first" || v === "client-first";

const inMemory = new Map<string, string>();
let storageUsable = true;

const read = (key: string): string | null => {
  if (storageUsable) {
    try {
      return window.localStorage.getItem(key) ?? inMemory.get(key) ?? null;
    } catch {
      storageUsable = false;
    }
  }
  return inMemory.get(key) ?? null;
};

const listeners = new Set<() => void>();

const write = (key: string, value: string): void => {
  inMemory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    storageUsable = false;
  }
  for (const notify of [...listeners]) notify();
};

export const currentTheme = (): Theme => {
  const stored = read(THEME_KEY);
  return isTheme(stored) ? stored : "system";
};

export const setTheme = (theme: Theme): void => write(THEME_KEY, theme);

export const currentSaleFlow = (): SaleFlowOrder => {
  const stored = read(FLOW_KEY);
  return isFlow(stored) ? stored : "products-first";
};

export const setSaleFlow = (order: SaleFlowOrder): void =>
  write(FLOW_KEY, order);

// ---- in-app notices ----

export const recapEnabled = (): boolean => read(NOTIFY_RECAP_KEY) !== "off";
export const setRecapEnabled = (on: boolean): void =>
  write(NOTIFY_RECAP_KEY, on ? "on" : "off");

export const taxNoteEnabled = (): boolean => read(NOTIFY_TAX_KEY) !== "off";
export const setTaxNoteEnabled = (on: boolean): void =>
  write(NOTIFY_TAX_KEY, on ? "on" : "off");

/** "2026-07" — the last month whose recap was already shown. */
export const recapShownFor = (): string | null => read(RECAP_SHOWN_KEY);
export const markRecapShown = (month: string): void =>
  write(RECAP_SHOWN_KEY, month);

/** "2026" — the year whose tax-season note was dismissed. */
export const taxNoteDismissedFor = (): string | null =>
  read(TAX_DISMISSED_KEY);
export const dismissTaxNote = (year: string): void =>
  write(TAX_DISMISSED_KEY, year);

export const subscribeToSettings = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === THEME_KEY ||
      event.key === FLOW_KEY ||
      event.key === NOTIFY_RECAP_KEY ||
      event.key === NOTIFY_TAX_KEY
    )
      onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};
