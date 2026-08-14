/**
 * Business profile — v0.6.7, the first ACCOUNT-level settings. Three
 * free-text facts the tax export wants on top: who the business is,
 * who owns it, which state. Context for a human preparer; never fed
 * into any calculation (no tax logic — the boundary stands).
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
