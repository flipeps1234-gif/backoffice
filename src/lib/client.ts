/**
 * Clients. Deliberately thin: a client is a name the owner sells to,
 * plus notes. Remembered prices, sizes and "their usual" stay DERIVED
 * from sales history (see customer-memory.ts for the pattern) — storing
 * them here would create a second copy that drifts from the truth.
 *
 * Self-building: nobody fills in a client directory up front. A sale to
 * an unknown name offers "save client?" — one tap — and the directory
 * assembles itself out of real work.
 */

export type Client = {
  id: string;
  name: string;
  notes: string;
  /** Round-trip distance per visit, integer TENTHS of a mile (the
   *  integer-cents philosophy applied to distance). Typed once by the
   *  owner; × logged visits = the mileage estimate. null = never set.
   *  NEVER measured — no GPS, no tracking (v0.6.5 boundary). */
  distanceTenths: number | null;
};

const norm = (name: string): string => name.trim().toLowerCase();

/** Case-insensitive lookup, same posture as findByName in service.ts. */
export const findClientByName = (
  clients: Client[],
  name: string,
): Client | undefined => {
  const needle = norm(name);
  if (!needle) return undefined;
  return clients.find((c) => norm(c.name) === needle);
};
