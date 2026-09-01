import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { byMonth, marginByService, revenueByService } from "../dashboard";
import { service, transactionsArb, txn } from "./arbitraries";

/**
 * The dashboard is the business's financial picture, so it reads BUSINESS
 * rows only — personal money and rows nobody has sorted yet stay out of it.
 *
 * Two kinds of cost live here and must never blend: ACTUALS (logged expense
 * rows, which feed money-out and the tax export) and ESTIMATES (the
 * catalog's cost field, which feeds margin and nothing else).
 */

const RUNS = { numRuns: 500 };

describe("only sorted business rows reach the dashboard", () => {
  it("ignores personal rows and rows still waiting to be sorted", () => {
    const rows = [
      txn({ id: "a", business: true, amountCents: 10_000, date: "2026-07-04" }),
      txn({ id: "b", business: false, amountCents: 99_000, date: "2026-07-04" }),
      txn({ id: "c", business: null, amountCents: 77_000, date: "2026-07-04" }),
    ];
    expect(byMonth(rows)).toEqual([{ month: "2026-07", inCents: 10_000, outCents: 0 }]);
  });

  it("counts nothing at all when no row has been sorted into the business", () => {
    const rows = [txn({ business: null }), txn({ business: false })];
    expect(byMonth(rows)).toEqual([]);
    expect(revenueByService(rows, [])).toEqual([]);
    expect(marginByService(rows, [service({ costCents: 100 })])).toEqual([]);
  });

  it("returns empty views for an empty ledger rather than undefined", () => {
    expect(byMonth([])).toEqual([]);
    expect(revenueByService([], [])).toEqual([]);
    expect(marginByService([], [])).toEqual([]);
  });
});

describe("money in and money out, by month", () => {
  it("keeps the two directions in separate columns", () => {
    const rows = [
      txn({ business: true, direction: "in", amountCents: 12_000, date: "2026-07-04" }),
      txn({ business: true, direction: "out", amountCents: 3_400, date: "2026-07-19" }),
    ];
    expect(byMonth(rows)).toEqual([
      { month: "2026-07", inCents: 12_000, outCents: 3_400 },
    ]);
  });

  it("splits on the calendar month, including across a year boundary", () => {
    const rows = [
      txn({ business: true, amountCents: 100, date: "2025-12-31" }),
      txn({ business: true, amountCents: 200, date: "2026-01-01" }),
    ];
    expect(byMonth(rows).map((m) => m.month)).toEqual(["2026-01", "2025-12"]);
  });

  it("gathers undated rows into their own group at the end", () => {
    const rows = [
      txn({ business: true, amountCents: 100, date: "" }),
      txn({ business: true, amountCents: 200, date: "2026-01-01" }),
    ];
    expect(byMonth(rows)).toEqual([
      { month: "2026-01", inCents: 200, outCents: 0 },
      { month: "", inCents: 100, outCents: 0 },
    ]);
  });

  it("adds up to the same money as the ledger it came from", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) => {
        const business = rows.filter((tx) => tx.business === true);
        const months = byMonth(rows);
        const inTotal = months.reduce((sum, m) => sum + m.inCents, 0);
        const outTotal = months.reduce((sum, m) => sum + m.outCents, 0);
        expect(inTotal).toBe(
          business
            .filter((tx) => tx.direction !== "out")
            .reduce((sum, tx) => sum + tx.amountCents, 0),
        );
        expect(outTotal).toBe(
          business
            .filter((tx) => tx.direction === "out")
            .reduce((sum, tx) => sum + tx.amountCents, 0),
        );
      }),
      RUNS,
    );
  });
});

describe("revenue by service", () => {
  const mowing = service({ id: "svc-1", name: "Lawn mowing" });

  it("groups income by the service stamped on the payment", () => {
    const rows = [
      txn({ business: true, serviceId: "svc-1", amountCents: 6_000 }),
      txn({ business: true, serviceId: "svc-1", amountCents: 6_500 }),
    ];
    expect(revenueByService(rows, [mowing])).toEqual([
      { serviceId: "svc-1", name: "Lawn mowing", jobs: 2, revenueCents: 12_500 },
    ]);
  });

  it("keeps expenses out — this is revenue, not net", () => {
    const rows = [
      txn({ business: true, serviceId: "svc-1", amountCents: 6_000 }),
      txn({ business: true, serviceId: "svc-1", amountCents: 1_000, direction: "out" }),
    ];
    expect(revenueByService(rows, [mowing])[0].revenueCents).toBe(6_000);
  });

  it("gathers unstamped income under 'No service' instead of dropping it", () => {
    const rows = [txn({ business: true, serviceId: null, amountCents: 4_000 })];
    expect(revenueByService(rows, [mowing])).toEqual([
      { serviceId: null, name: "No service", jobs: 1, revenueCents: 4_000 },
    ]);
  });

  it("keeps the money visible under 'Deleted service' when the catalog entry is gone", () => {
    const rows = [txn({ business: true, serviceId: "gone", amountCents: 4_000 })];
    expect(revenueByService(rows, [mowing])).toEqual([
      { serviceId: "gone", name: "Deleted service", jobs: 1, revenueCents: 4_000 },
    ]);
  });

  it("ranks the biggest earner first", () => {
    const rows = [
      txn({ business: true, serviceId: "svc-1", amountCents: 1_000 }),
      txn({ business: true, serviceId: "svc-2", amountCents: 9_000 }),
    ];
    const ranked = revenueByService(rows, [mowing, service({ id: "svc-2", name: "Deep clean" })]);
    expect(ranked.map((r) => r.serviceId)).toEqual(["svc-2", "svc-1"]);
  });

  it("accounts for every business income row exactly once", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) => {
        const income = rows.filter(
          (tx) => tx.business === true && tx.direction !== "out",
        );
        const grouped = revenueByService(rows, []);
        expect(grouped.reduce((sum, g) => sum + g.jobs, 0)).toBe(income.length);
        expect(grouped.reduce((sum, g) => sum + g.revenueCents, 0)).toBe(
          income.reduce((sum, tx) => sum + tx.amountCents, 0),
        );
      }),
      RUNS,
    );
  });
});

describe("margin by service — an estimate, and honest about what it cannot estimate", () => {
  it("says nothing about a service with no cost on file", () => {
    const rows = [txn({ business: true, serviceId: "svc-1", amountCents: 6_000 })];
    expect(marginByService(rows, [service({ id: "svc-1", costCents: null })])).toEqual([]);
  });

  it("says nothing about a service nobody has sold", () => {
    expect(marginByService([], [service({ id: "svc-1", costCents: 1_000 })])).toEqual([]);
  });

  it("charges a flat service's cost estimate once per job", () => {
    const flat = service({
      id: "svc-1",
      name: "Deep clean",
      pricing: { type: "flat", cents: 12_000 },
      costCents: 2_000,
    });
    const rows = [
      txn({ business: true, serviceId: "svc-1", amountCents: 12_000 }),
      txn({ business: true, serviceId: "svc-1", amountCents: 12_000 }),
    ];
    expect(marginByService(rows, [flat])).toEqual([
      {
        serviceId: "svc-1",
        name: "Deep clean",
        estimableRevenueCents: 24_000,
        estCostCents: 4_000,
        marginCents: 20_000,
        unestimatedJobs: 0,
      },
    ]);
  });

  it("charges a rate service's cost estimate per unit of the job's recorded size", () => {
    const rate = service({
      id: "svc-1",
      name: "Cleaning",
      pricing: { type: "rate", cents: 18, unit: "sqft" },
      costCents: 5,
    });
    const rows = [txn({ business: true, serviceId: "svc-1", amountCents: 18_000, quantity: 1_000 })];
    expect(marginByService(rows, [rate])[0]).toMatchObject({
      estimableRevenueCents: 18_000,
      estCostCents: 5_000,
      marginCents: 13_000,
      unestimatedJobs: 0,
    });
  });

  it("excludes a rate job with no recorded size from BOTH sides, never scoring it as pure profit", () => {
    const rate = service({
      id: "svc-1",
      pricing: { type: "rate", cents: 18, unit: "sqft" },
      costCents: 5,
    });
    const rows = [
      txn({ id: "a", business: true, serviceId: "svc-1", amountCents: 18_000, quantity: 1_000 }),
      txn({ id: "b", business: true, serviceId: "svc-1", amountCents: 9_000, quantity: null }),
    ];
    const [entry] = marginByService(rows, [rate]);
    expect(entry.estimableRevenueCents).toBe(18_000);
    expect(entry.estCostCents).toBe(5_000);
    expect(entry.unestimatedJobs).toBe(1);
  });

  it("reports zeros rather than a break-even when nothing about the service can be estimated", () => {
    const rate = service({
      id: "svc-1",
      pricing: { type: "rate", cents: 18, unit: "sqft" },
      costCents: 5,
    });
    const rows = [txn({ business: true, serviceId: "svc-1", amountCents: 9_000, quantity: null })];
    expect(marginByService(rows, [rate])).toEqual([
      {
        serviceId: "svc-1",
        name: "Lawn mowing",
        estimableRevenueCents: 0,
        estCostCents: 0,
        marginCents: 0,
        unestimatedJobs: 1,
      },
    ]);
  });

  it("keeps margin off expense rows — actual costs are a different number", () => {
    const flat = service({ id: "svc-1", pricing: { type: "flat", cents: 12_000 }, costCents: 2_000 });
    const rows = [
      txn({ business: true, serviceId: "svc-1", amountCents: 12_000 }),
      txn({ business: true, serviceId: "svc-1", amountCents: 500, direction: "out" }),
    ];
    expect(marginByService(rows, [flat])[0].estimableRevenueCents).toBe(12_000);
    expect(marginByService(rows, [flat])[0].estCostCents).toBe(2_000);
  });

  it("never reports a margin that is not revenue minus cost", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) => {
        const catalog = [
          service({ id: "svc-1", pricing: { type: "flat", cents: 6_000 }, costCents: 1_000 }),
          service({ id: "svc-2", pricing: { type: "rate", cents: 20, unit: "hour" }, costCents: 7 }),
        ];
        for (const entry of marginByService(rows, catalog)) {
          expect(entry.marginCents).toBe(
            entry.estimableRevenueCents - entry.estCostCents,
          );
          expect(Number.isInteger(entry.marginCents)).toBe(true);
        }
      }),
      RUNS,
    );
  });
});
