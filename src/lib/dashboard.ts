import type { Service } from "./service";
import type { Transaction } from "./transaction";

/**
 * The dashboard's math. Business rows only — this is the business's
 * financial picture; personal money stays out of it.
 *
 * Two kinds of "cost" live here and must never blend:
 * - ACTUALS: logged expense rows. They feed money-out and the tax export.
 * - ESTIMATES: the catalog's per-service cost field. They feed margin ONLY,
 *   and margin is always labeled an estimate.
 */

const business = (transactions: Transaction[]): Transaction[] =>
  transactions.filter((tx) => tx.business === true);

// ---- Money in vs money out, by month ----

export type MonthSummary = {
  /** "2026-07", or "" for undated rows. */
  month: string;
  inCents: number;
  outCents: number;
};

export const byMonth = (transactions: Transaction[]): MonthSummary[] => {
  const months = new Map<string, { inCents: number; outCents: number }>();

  for (const tx of business(transactions)) {
    const month = tx.date ? tx.date.slice(0, 7) : "";
    const entry = months.get(month) ?? { inCents: 0, outCents: 0 };
    if (tx.direction === "out") entry.outCents += tx.amountCents;
    else entry.inCents += tx.amountCents;
    months.set(month, entry);
  }

  return [...months.entries()]
    .sort(([a], [b]) => {
      if (a === "") return 1;
      if (b === "") return -1;
      return b.localeCompare(a);
    })
    .map(([month, sums]) => ({ month, ...sums }));
};

// ---- Revenue by service ----

export type ServiceRevenue = {
  serviceId: string | null;
  name: string;
  jobs: number;
  revenueCents: number;
};

export const revenueByService = (
  transactions: Transaction[],
  services: Service[],
): ServiceRevenue[] => {
  const byId = new Map<string | null, ServiceRevenue>();

  for (const tx of business(transactions)) {
    if (tx.direction === "out") continue;
    const key = tx.serviceId;
    const entry =
      byId.get(key) ??
      ({
        serviceId: key,
        name: key
          ? (services.find((s) => s.id === key)?.name ?? "Deleted service")
          : "No service",
        jobs: 0,
        revenueCents: 0,
      } satisfies ServiceRevenue);
    entry.jobs += 1;
    entry.revenueCents += tx.amountCents;
    byId.set(key, entry);
  }

  return [...byId.values()].sort((a, b) => b.revenueCents - a.revenueCents);
};

// ---- Margin per service (ESTIMATES — never tax data) ----

export type ServiceMargin = {
  serviceId: string;
  name: string;
  /** Revenue of the jobs the estimate could cover — NOT all revenue. */
  estimableRevenueCents: number;
  /** Estimated from the catalog's cost field, over those same jobs. */
  estCostCents: number;
  marginCents: number;
  /** Rate-priced jobs with no recorded size — fully excluded, both sides. */
  unestimatedJobs: number;
};

export const marginByService = (
  transactions: Transaction[],
  services: Service[],
): ServiceMargin[] => {
  const out: ServiceMargin[] = [];

  for (const service of services) {
    if (service.costCents == null) continue;

    const rows = business(transactions).filter(
      (tx) => tx.direction === "in" && tx.serviceId === service.id,
    );
    if (rows.length === 0) continue;

    // A job whose cost can't be estimated is excluded from BOTH sides of the
    // subtraction. Counting its revenue while skipping its cost would score
    // missing data as pure profit and rank the least-known services highest.
    let estimableRevenueCents = 0;
    let estCostCents = 0;
    let unestimatedJobs = 0;

    for (const tx of rows) {
      if (service.pricing.type === "flat") {
        // Flat service: the cost estimate is per job.
        estimableRevenueCents += tx.amountCents;
        estCostCents += service.costCents;
      } else if (tx.quantity != null) {
        // Rate service: cost is per unit, so we need the job's size.
        estimableRevenueCents += tx.amountCents;
        estCostCents += Math.round(service.costCents * tx.quantity);
      } else {
        unestimatedJobs += 1;
      }
    }

    if (estimableRevenueCents === 0 && unestimatedJobs > 0) {
      // Nothing estimable at all — a margin of 0−0 would read as break-even.
      out.push({
        serviceId: service.id,
        name: service.name,
        estimableRevenueCents: 0,
        estCostCents: 0,
        marginCents: 0,
        unestimatedJobs,
      });
      continue;
    }

    out.push({
      serviceId: service.id,
      name: service.name,
      estimableRevenueCents,
      estCostCents,
      marginCents: estimableRevenueCents - estCostCents,
      unestimatedJobs,
    });
  }

  return out.sort((a, b) => b.marginCents - a.marginCents);
};
