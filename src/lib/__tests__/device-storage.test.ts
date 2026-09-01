import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The three per-device stores: which language this screen reads, which
 * terms this device accepted, and this device's settings. All per DEVICE
 * and not per account, on purpose — a borrowed phone must not inherit
 * someone else's language, and the terms gate has to work before there is
 * an account at all.
 *
 * Each one falls back to memory when localStorage throws, because private
 * browsing and locked-down webviews do exactly that, and being unable to
 * get past the terms gate would make the app unusable for precisely the
 * people most careful about their privacy.
 *
 * These modules hold module-level state, so every test imports them fresh
 * against its own fake window.
 */

type Listener = (event: { key: string | null }) => void;

const makeWindow = (options: { throws?: boolean; initial?: Record<string, string> } = {}) => {
  const store = new Map(Object.entries(options.initial ?? {}));
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    store,
    win: {
      localStorage: {
        getItem: (key: string): string | null => {
          if (options.throws) throw new Error("SecurityError: storage is blocked");
          return store.get(key) ?? null;
        },
        setItem: (key: string, value: string): void => {
          if (options.throws) throw new Error("SecurityError: storage is blocked");
          store.set(key, value);
        },
      },
      addEventListener: (type: string, fn: Listener) => {
        const set = listeners.get(type) ?? new Set<Listener>();
        set.add(fn);
        listeners.set(type, set);
      },
      removeEventListener: (type: string, fn: Listener) => {
        listeners.get(type)?.delete(fn);
      },
    },
  };
};

const load = async <T>(
  path: string,
  options: Parameters<typeof makeWindow>[0] = {},
  navigatorLanguage = "en-US",
): Promise<{ mod: T; harness: ReturnType<typeof makeWindow> }> => {
  vi.resetModules();
  const harness = makeWindow(options);
  vi.stubGlobal("window", harness.win);
  vi.stubGlobal("navigator", { language: navigatorLanguage });
  const mod = (await import(path)) as T;
  return { mod, harness };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

type LocaleModule = typeof import("../locale");
type TermsModule = typeof import("../terms");
type SettingsModule = typeof import("../settings");

describe("which language this device reads", () => {
  it("follows the phone's own language until someone picks one", async () => {
    for (const [language, expected] of [
      ["es-419", "es"],
      ["es", "es"],
      ["pt-BR", "pt"],
      ["en-GB", "en"],
      ["fr-FR", "en"],
      ["", "en"],
    ] as const) {
      const { mod } = await load<LocaleModule>("../locale", {}, language);
      expect(mod.currentLocale()).toBe(expected);
    }
  });

  it("prefers what was actually chosen over what the phone is set to", async () => {
    const { mod } = await load<LocaleModule>("../locale", { initial: { "contado.locale": "pt" } }, "es-ES");
    expect(mod.currentLocale()).toBe("pt");
  });

  it("ignores a stored value that is not one of the three languages", async () => {
    const { mod } = await load<LocaleModule>("../locale", { initial: { "contado.locale": "de" } }, "es-ES");
    expect(mod.currentLocale()).toBe("es");
  });

  it("remembers a choice for next time", async () => {
    const { mod, harness } = await load<LocaleModule>("../locale");
    mod.setLocale("es");
    expect(harness.store.get("contado.locale")).toBe("es");
    expect(mod.currentLocale()).toBe("es");
  });

  it("still works in private browsing, where storage throws on every access", async () => {
    const { mod } = await load<LocaleModule>("../locale", { throws: true }, "pt-BR");
    expect(mod.currentLocale()).toBe("pt");
    expect(() => mod.setLocale("es")).not.toThrow();
    expect(mod.currentLocale()).toBe("es");
  });

  it("tells the app when the language changes, and stops when unsubscribed", async () => {
    const { mod } = await load<LocaleModule>("../locale");
    let calls = 0;
    const unsubscribe = mod.subscribeToLocale(() => {
      calls += 1;
    });
    mod.setLocale("es");
    expect(calls).toBe(1);
    unsubscribe();
    mod.setLocale("pt");
    expect(calls).toBe(1);
  });

  it("lets a second tab's choice reach this one", async () => {
    const { mod, harness } = await load<LocaleModule>("../locale");
    let calls = 0;
    mod.subscribeToLocale(() => {
      calls += 1;
    });
    for (const fn of harness.listeners.get("storage") ?? []) fn({ key: "contado.locale" });
    expect(calls).toBe(1);
    for (const fn of harness.listeners.get("storage") ?? []) fn({ key: "something.else" });
    expect(calls).toBe(1);
  });
});

describe("the terms this device accepted", () => {
  it("has accepted nothing on a fresh device", async () => {
    const { mod } = await load<TermsModule>("../terms");
    expect(mod.acceptedVersion()).toBeNull();
  });

  it("records the current version when accepted", async () => {
    const { mod, harness } = await load<TermsModule>("../terms");
    mod.acceptTerms();
    expect(mod.acceptedVersion()).toBe(mod.TERMS_VERSION);
    expect(harness.store.get("contado.terms")).toBe(mod.TERMS_VERSION);
  });

  it("keeps a device that accepted an older version out until it accepts again", async () => {
    const { mod } = await load<TermsModule>("../terms", {
      initial: { "contado.terms": "2020-01-01" },
    });
    expect(mod.acceptedVersion()).toBe("2020-01-01");
    expect(mod.acceptedVersion()).not.toBe(mod.TERMS_VERSION);
  });

  it("still opens the gate when storage is blocked, losing only the memory of it", async () => {
    const { mod } = await load<TermsModule>("../terms", { throws: true });
    expect(mod.acceptedVersion()).toBeNull();
    expect(() => mod.acceptTerms()).not.toThrow();
    expect(mod.acceptedVersion()).toBe(mod.TERMS_VERSION);
  });

  it("releases the gate in the other tab too", async () => {
    const { mod, harness } = await load<TermsModule>("../terms");
    let calls = 0;
    const unsubscribe = mod.subscribeToTerms(() => {
      calls += 1;
    });
    mod.acceptTerms();
    expect(calls).toBe(1);
    for (const fn of harness.listeners.get("storage") ?? []) fn({ key: "contado.terms" });
    expect(calls).toBe(2);
    unsubscribe();
    mod.acceptTerms();
    expect(calls).toBe(2);
  });

  it("carries a version that says when the terms last changed materially", async () => {
    const { mod } = await load<TermsModule>("../terms");
    expect(mod.TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("this device's settings", () => {
  it("starts on the system theme, products-first, with both notices on", async () => {
    const { mod } = await load<SettingsModule>("../settings");
    expect(mod.currentTheme()).toBe("system");
    expect(mod.currentSaleFlow()).toBe("products-first");
    expect(mod.recapEnabled()).toBe(true);
    expect(mod.taxNoteEnabled()).toBe(true);
    expect(mod.recapShownFor()).toBeNull();
    expect(mod.taxNoteDismissedFor()).toBeNull();
  });

  it("remembers a theme and a sale-flow order", async () => {
    const { mod, harness } = await load<SettingsModule>("../settings");
    mod.setTheme("dark");
    mod.setSaleFlow("client-first");
    expect(mod.currentTheme()).toBe("dark");
    expect(mod.currentSaleFlow()).toBe("client-first");
    expect(harness.store.get("contado.theme")).toBe("dark");
  });

  it("falls back to the default rather than trusting a nonsense stored value", async () => {
    const { mod } = await load<SettingsModule>("../settings", {
      initial: { "contado.theme": "neon", "contado.saleflow": "sideways" },
    });
    expect(mod.currentTheme()).toBe("system");
    expect(mod.currentSaleFlow()).toBe("products-first");
  });

  it("turns the in-app notices off and on again", async () => {
    const { mod } = await load<SettingsModule>("../settings");
    mod.setRecapEnabled(false);
    mod.setTaxNoteEnabled(false);
    expect(mod.recapEnabled()).toBe(false);
    expect(mod.taxNoteEnabled()).toBe(false);
    mod.setRecapEnabled(true);
    expect(mod.recapEnabled()).toBe(true);
  });

  it("marks a recap shown so it shows once, not forever", async () => {
    const { mod } = await load<SettingsModule>("../settings");
    mod.markRecapShown("2026-07");
    expect(mod.recapShownFor()).toBe("2026-07");
    mod.dismissTaxNote("2026");
    expect(mod.taxNoteDismissedFor()).toBe("2026");
  });

  it("keeps working when storage is blocked", async () => {
    const { mod } = await load<SettingsModule>("../settings", { throws: true });
    expect(() => mod.setTheme("light")).not.toThrow();
    expect(mod.currentTheme()).toBe("light");
  });

  it("tells the app about a change here or in another tab, and stops when unsubscribed", async () => {
    const { mod, harness } = await load<SettingsModule>("../settings");
    let calls = 0;
    const unsubscribe = mod.subscribeToSettings(() => {
      calls += 1;
    });
    mod.setTheme("dark");
    expect(calls).toBe(1);
    for (const fn of harness.listeners.get("storage") ?? []) fn({ key: "contado.saleflow" });
    expect(calls).toBe(2);
    for (const fn of harness.listeners.get("storage") ?? []) fn({ key: "unrelated" });
    expect(calls).toBe(2);
    unsubscribe();
    mod.setTheme("light");
    expect(calls).toBe(2);
  });
});
