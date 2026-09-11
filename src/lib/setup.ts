/**
 * Welcome tour (setup wizard) — 2026-09-10. Shown ONCE per account, after
 * sign-in and before the hub. This module holds the rule; the screens
 * live in src/app/setup-wizard.tsx.
 *
 * The rule is a pure function of three server facts so every device
 * agrees without a per-device marker: no business_profiles row AND no
 * ledger rows at all. The profile row is what "tour done" means — the
 * hub CREATES it on the business step's Continue (or on Not now / Skip),
 * even with every field blank (see src/lib/profile.ts); Finish then only
 * ends the tour. Accounts that already logged
 * money predate the tour and never see it; the empty-ledger check is
 * what protects them, not a migration.
 *
 * Not here on purpose: the "has loadProfile succeeded" gate. A failed
 * load must never read as "no row" (src/lib/supabase/profile.ts) — the
 * caller feeds this function only facts it actually loaded.
 */

export type SetupFacts = {
  /** A business_profiles row exists for the account (loaded, not assumed). */
  profileExists: boolean;
  transactionCount: number;
  saleCount: number;
};

export const needsSetup = ({
  profileExists,
  transactionCount,
  saleCount,
}: SetupFacts): boolean =>
  !profileExists && transactionCount === 0 && saleCount === 0;

/** The four screens, in order. The wizard walks this list; the step
 *  indicator draws one dot per entry.
 *
 *  2026-09-11: the business profile comes FIRST — the moment an account
 *  exists it is asked for its business, with "Not now" as the way out.
 *  The welcome screen that used to precede it is gone; what the app does
 *  is shown, not told, by the steps that follow. Continue on the
 *  business step writes the profile row right then (not at the end), so
 *  a reload after it lands in the hub with the fields kept — the row is
 *  what "done" means, and the remaining steps are practice. */
export const SETUP_STEPS = [
  "business",
  "services",
  "try",
  "done",
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];
