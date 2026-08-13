/**
 * First-use acknowledgement.
 *
 * Stored per device, not per account, because the thing being acknowledged is
 * what happens on THIS device — images leaving it, a shared demo account on a
 * borrowed phone. It is also the only store available before sign-in, and the
 * disclosure has to come before the email does.
 *
 * Versioned so a material change can ask again. Bumping the version re-prompts
 * everyone; that is the point, so don't bump it for a typo.
 */
export const TERMS_VERSION = "2026-08-06";

// Renamed from "swipebooks.terms" with the rebrand. A device that accepted
// under the old key will not have this one, so it sees the terms once more —
// harmless (the app has no real users yet) and arguably correct: a new name
// is worth re-acknowledging. Not worth a migration to read both keys.
const KEY = "contado.terms";

/**
 * Fallback for private browsing and locked-down webviews, where localStorage
 * throws on access. Losing the record next launch is a mild annoyance; being
 * unable to get past the gate at all because the browser forbids storage would
 * make the app unusable for exactly the people most careful about privacy.
 */
let inMemory: string | null = null;
let storageUsable = true;

const listeners = new Set<() => void>();

const readStored = (): string | null => {
  if (!storageUsable) return inMemory;
  try {
    return window.localStorage.getItem(KEY) ?? inMemory;
  } catch {
    storageUsable = false;
    return inMemory;
  }
};

/** The version this device has agreed to, or null. */
export const acceptedVersion = (): string | null => readStored();

export const acceptTerms = (): void => {
  inMemory = TERMS_VERSION;
  try {
    window.localStorage.setItem(KEY, TERMS_VERSION);
  } catch {
    storageUsable = false;
  }
  for (const notify of [...listeners]) notify();
};

/**
 * Subscribe for useSyncExternalStore. Also listens for the storage event so
 * accepting in one tab releases the gate in the others, rather than leaving a
 * second tab stuck on a screen the user has already dealt with.
 */
export const subscribeToTerms = (onChange: () => void): (() => void) => {
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
