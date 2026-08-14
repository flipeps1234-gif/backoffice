import type { Client } from "./client";
import type { Sale } from "./sale";
import type { Service } from "./service";

/**
 * Sale-flow recommendations — v0.6.6, the two orders the settings page
 * offers. Everything here is DERIVED from sales history at ask time
 * (the customer-memory stance: no stored preferences that drift from
 * the truth), and everything is a RANKING, never a filter — the full
 * list stays reachable, suggestions just move to the front.
 */

/** Newest date wins ties; "" sorts last. */
const later = (a: string | undefined, b: string): string =>
  a === undefined || a < b ? b : a;

/**
 * Who was this sale probably for? Ranked by: most recently sold ANY of
 * the picked products, then most recent sale at all. Clients with no
 * sales history never appear — a suggestion the data can't back is
 * noise. Products-first mode shows these as chips at checkout.
 */
export const rankClientsForProducts = (
  clients: Client[],
  sales: Sale[],
  serviceIds: string[],
  limit = 4,
): Client[] => {
  const wanted = new Set(serviceIds);
  const lastWith = new Map<string, string>();
  const lastAny = new Map<string, string>();

  for (const sale of sales) {
    if (!sale.clientId) continue;
    lastAny.set(sale.clientId, later(lastAny.get(sale.clientId), sale.date));
    if (sale.lineItems.some((i) => i.serviceId && wanted.has(i.serviceId))) {
      lastWith.set(sale.clientId, later(lastWith.get(sale.clientId), sale.date));
    }
  }

  return clients
    .filter((c) => lastAny.has(c.id))
    .sort((a, b) => {
      const aWith = lastWith.get(a.id);
      const bWith = lastWith.get(b.id);
      if ((aWith !== undefined) !== (bWith !== undefined)) {
        return aWith !== undefined ? -1 : 1;
      }
      if (aWith !== undefined && bWith !== undefined && aWith !== bWith) {
        return aWith < bWith ? 1 : -1;
      }
      const aAny = lastAny.get(a.id)!;
      const bAny = lastAny.get(b.id)!;
      if (aAny !== bAny) return aAny < bAny ? 1 : -1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
};

/**
 * The client's usual services — bought at least once, ranked by how
 * often and then how recently. Client-first mode puts these on top of
 * the picker under a "their usual" heading; the rest keep catalog
 * order below.
 */
export const usualServiceIds = (
  sales: Sale[],
  clientId: string,
): Set<string> => {
  const ids = new Set<string>();
  for (const sale of sales) {
    if (sale.clientId !== clientId) continue;
    for (const item of sale.lineItems) {
      if (item.serviceId) ids.add(item.serviceId);
    }
  }
  return ids;
};

export const rankServicesForClient = (
  services: Service[],
  sales: Sale[],
  clientId: string,
): Service[] => {
  const count = new Map<string, number>();
  const last = new Map<string, string>();
  for (const sale of sales) {
    if (sale.clientId !== clientId) continue;
    for (const item of sale.lineItems) {
      if (!item.serviceId) continue;
      count.set(item.serviceId, (count.get(item.serviceId) ?? 0) + 1);
      last.set(item.serviceId, later(last.get(item.serviceId), sale.date));
    }
  }

  const usual = services.filter((s) => count.has(s.id));
  const rest = services.filter((s) => !count.has(s.id));
  usual.sort((a, b) => {
    const byCount = (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0);
    if (byCount !== 0) return byCount;
    const aLast = last.get(a.id) ?? "";
    const bLast = last.get(b.id) ?? "";
    if (aLast !== bLast) return aLast < bLast ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return [...usual, ...rest];
};
