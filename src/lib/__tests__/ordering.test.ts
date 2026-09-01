import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { byMonth, marginByService, revenueByService } from "../dashboard";
import { groupByDay } from "../history";
import { buildInsights } from "../insights";
import { mileageLog, totalTenths } from "../mileage";
import { dueRecap } from "../recap";
import { owedCents, receivedCents } from "../sale";
import { quarterIncomeCents } from "../setaside";
import { totalCents, totalsByDirection } from "../transaction";
import {
  businessIncomeArb,
  salesArb,
  serviceArb,
  transactionsArb,
} from "./arbitraries";

/**
 * LAW 4 — totals are order-independent.
 *
 * A ledger is a set of facts, not a sequence. The order rows happen to
 * arrive in (which screenshot was picked first, what the database returned)
 * must never change what the money adds up to. Where a function also
 * decides DISPLAY order, the display order has to be decided by the data
 * itself — an explicit tie-break — or the same ledger renders differently
 * on two devices.
 */

const RUNS = { numRuns: 500 };

/** Any permutation of the same rows. */
const shuffled = <T>(items: T[]): fc.Arbitrary<T[]> =>
  fc.shuffledSubarray(items, {
    minLength: items.length,
    maxLength: items.length,
  });

describe("running totals do not care what order the rows arrived in", () => {
  it("totalCents is the same for every permutation", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(totalCents(mixed)).toBe(totalCents(rows));
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });

  it("money in and money out are the same for every permutation", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(totalsByDirection(mixed)).toEqual(totalsByDirection(rows));
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });

  it("the received and owed figures are the same for every permutation of the sales", () => {
    fc.assert(
      fc.property(salesArb(), (sales) =>
        fc.assert(
          fc.property(shuffled(sales), (mixed) => {
            expect(receivedCents(mixed)).toBe(receivedCents(sales));
            expect(owedCents(mixed)).toBe(owedCents(sales));
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });

  it("this quarter's income is the same for every permutation", () => {
    fc.assert(
      fc.property(businessIncomeArb(), (rows) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(quarterIncomeCents(mixed, "2026-08-14")).toBe(
              quarterIncomeCents(rows, "2026-08-14"),
            );
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });

  it("last month's recap is the same for every permutation", () => {
    fc.assert(
      fc.property(businessIncomeArb(), (rows) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(dueRecap(mixed, "2026-08-14", null)).toEqual(
              dueRecap(rows, "2026-08-14", null),
            );
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });

  it("the mileage total is the same for every permutation of the sales", () => {
    fc.assert(
      fc.property(salesArb(), (sales) => {
        const distances = new Map(
          sales
            .filter((s) => s.clientId)
            .map((s, index) => [s.clientId as string, (index % 9) * 10 + 5]),
        );
        return fc.assert(
          fc.property(shuffled(sales), (mixed) => {
            expect(totalTenths(mileageLog(distances, mixed))).toBe(
              totalTenths(mileageLog(distances, sales)),
            );
          }),
          { numRuns: 8 },
        );
      }),
      RUNS,
    );
  });
});

describe("the by-month view is identical under permutation, rows and order alike", () => {
  it("produces the same months, in the same sequence, with the same sums", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(byMonth(mixed)).toEqual(byMonth(rows));
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });

  it("always puts undated rows last, whatever order they arrived in", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) => {
        const months = byMonth(rows).map((m) => m.month);
        const blank = months.indexOf("");
        if (blank !== -1) expect(blank).toBe(months.length - 1);
        const dated = months.filter((m) => m !== "");
        expect(dated).toEqual([...dated].sort().reverse());
      }),
      RUNS,
    );
  });
});

describe("revenue and margin per service survive permutation", () => {
  it("gives every service the same job count and revenue whatever the row order", () => {
    fc.assert(
      fc.property(transactionsArb(), fc.array(serviceArb, { maxLength: 4 }), (rows, services) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            const key = (entry: { serviceId: string | null }) =>
              entry.serviceId ?? "";
            const before = [...revenueByService(rows, services)].sort((a, b) =>
              key(a).localeCompare(key(b)),
            );
            const after = [...revenueByService(mixed, services)].sort((a, b) =>
              key(a).localeCompare(key(b)),
            );
            expect(after).toEqual(before);
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });

  it("computes the same margin per service whatever the row order", () => {
    fc.assert(
      fc.property(transactionsArb(), fc.array(serviceArb, { maxLength: 4 }), (rows, services) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(marginByService(mixed, services)).toEqual(
              marginByService(rows, services),
            );
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });
});

describe("the three insights are decided by the data, never by the arrival order", () => {
  it("returns exactly the same three facts for every permutation", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(buildInsights(mixed)).toEqual(buildInsights(rows));
          }),
          { numRuns: 8 },
        ),
      ),
      RUNS,
    );
  });
});

describe("history groups days by date, not by arrival", () => {
  // Fewer runs here than elsewhere on purpose: every group label goes
  // through Intl.DateTimeFormat, which costs ~100× a plain comparison.
  // 100 × 6 permutations still exercises the ordering thoroughly.
  it("puts the same days in the same order, newest first and undated last", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) =>
        fc.assert(
          fc.property(shuffled(rows), (mixed) => {
            expect(groupByDay(mixed, "2026-08-14").map((g) => g.date)).toEqual(
              groupByDay(rows, "2026-08-14").map((g) => g.date),
            );
          }),
          { numRuns: 6 },
        ),
      ),
      { numRuns: 100 },
    );
  });

  it("keeps every triaged row exactly once across the groups", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) => {
        const grouped = groupByDay(rows, "2026-08-14").flatMap(
          (g) => g.transactions,
        );
        const triaged = rows.filter((tx) => tx.business !== null);
        expect(grouped).toHaveLength(triaged.length);
        expect(new Set(grouped.map((tx) => tx.id))).toEqual(
          new Set(triaged.map((tx) => tx.id)),
        );
      }),
      RUNS,
    );
  });
});
