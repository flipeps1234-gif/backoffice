/**
 * Mileage-lite — v0.6.5. One number per client (round-trip distance,
 * stored as integer TENTHS of a mile, same philosophy as integer cents)
 * × the visits actually logged = a computed mileage log.
 *
 * NEVER GPS, never background tracking — the distance is typed once by
 * the owner, and a "visit" is a logged sale. If they logged the job,
 * they drove there. The log is an estimate a preparer can work from,
 * labeled as such; it is not a tracker.
 */

export type MileageEntry = {
  /** The sale's date. */
  date: string;
  clientId: string;
  /** Round trip for that one visit, in tenths of a mile. */
  tenths: number;
};

/**
 * distanceByClient: clientId → round-trip tenths. Sales with no client or
 * whose client has no distance recorded contribute nothing — a missing
 * number is missing, never guessed.
 *
 * An OPEN sale that a RECURRING TEMPLATE created is not a visit: the
 * machine minted it as expected revenue, and "if they logged the job,
 * they drove there" only holds for things the owner logged. Three weeks
 * of vacation must not back-fill three phantom trips into a document a
 * tax preparer reads. The owner marking the instance paid is the
 * evidence the visit happened — then it counts.
 */
export const mileageLog = (
  distanceByClient: Map<string, number>,
  sales: {
    clientId: string | null;
    date: string;
    state: string;
    recurringTemplateId: string | null;
  }[],
): MileageEntry[] => {
  const entries: MileageEntry[] = [];
  for (const sale of sales) {
    if (!sale.clientId) continue;
    if (sale.recurringTemplateId !== null && sale.state === "open") continue;
    const tenths = distanceByClient.get(sale.clientId);
    if (tenths === undefined || tenths <= 0) continue;
    entries.push({ date: sale.date, clientId: sale.clientId, tenths });
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date));
};

export const totalTenths = (log: MileageEntry[]): number =>
  log.reduce((sum, entry) => sum + entry.tenths, 0);

/** 125 tenths → "12.5". Display only — math stays integer. */
export const formatMiles = (tenths: number): string =>
  (tenths / 10).toFixed(1);

/** "12.5" typed by the owner → 125 tenths. Same tolerant comma/dot
 *  posture as dollarsToCents; anything unparseable is null (unset). */
export const parseMilesToTenths = (input: string): number | null => {
  const cleaned = input.replace(/[^0-9.,]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const miles = Number.parseFloat(cleaned);
  if (!Number.isFinite(miles) || miles <= 0) return null;
  // 9,999.9 miles round trip is already absurd; cap keeps the int4 safe.
  return Math.min(99_999, Math.round(miles * 10));
};
