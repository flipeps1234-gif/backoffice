/**
 * Where Google Analytics may load (owner decision 2026-10-08: "No analytics
 * there"). Visitors in the EU/EEA, the UK, Switzerland and Brazil get no
 * analytics at all — their laws want consent before analytics cookies, and
 * contado serves US crews, so skipping GA there costs little and needs no
 * banner. An unknown country (no header, "XX", Tor's "T1") is treated the
 * same way: analytics only when we positively know the visitor is elsewhere.
 * Dependency-free so the unit test can load it bare.
 */
const NO_ANALYTICS = new Set([
  // EU 27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA beyond the EU, the UK, Switzerland, Brazil (LGPD)
  "IS", "LI", "NO", "GB", "CH", "BR",
  // Territories that report their own code but sit under EU law
  "GF", "GP", "MQ", "RE", "YT", "MF", "AX",
]);

export const analyticsAllowedIn = (country: string | null | undefined): boolean => {
  const code = (country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") return false;
  return !NO_ANALYTICS.has(code);
};
