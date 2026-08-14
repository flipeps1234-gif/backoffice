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

export const subscribeToSettings = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === FLOW_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};
