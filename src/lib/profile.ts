/**
 * Business profile — v0.6.7, the first ACCOUNT-level settings. Three
 * free-text facts the tax export wants on top: who the business is,
 * who owns it, which state. Context for a human preparer; never fed
 * into any calculation (no tax logic — the boundary stands).
 *
 * The ROW has a second meaning since the welcome tour (2026-09-10): its
 * existence is "this account finished the tour". The tour's Continue on
 * its first step, Not now and Skip all save the profile — blank fields
 * included (Finish normally has nothing left to write) — so an account
 * with a row, even an all-empty one, is never asked again on any
 * device. loadProfile returns null when there is no row; the form maps
 * that to EMPTY_PROFILE, the tour rule (src/lib/setup.ts) reads it as
 * "not done". Nothing else reads the row's mere existence. The tour's
 * first-use write is a create-if-absent (insertProfileIfAbsent), never
 * an upsert: a second device still in the tour must not blank a row
 * the first one just wrote. Settings and the tour's review mode keep
 * the plain upsert (saveProfile) — the row exists, the fields changed.
 */

export type BusinessProfile = {
  businessName: string;
  ownerName: string;
  /** Two-letter US state as typed ("FL"). Uppercased on save, that's all. */
  usState: string;
};

export const EMPTY_PROFILE: BusinessProfile = {
  businessName: "",
  ownerName: "",
  usState: "",
};

export const hasProfile = (p: BusinessProfile): boolean =>
  p.businessName !== "" || p.ownerName !== "" || p.usState !== "";
