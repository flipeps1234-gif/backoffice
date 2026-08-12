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
