import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { buildInsights, type Insight } from "../insights";
import { transactionsArb, txn } from "./arbitraries";

/**
 * The payoff for uploading: three facts computed from what the user just
 * confirmed. This runs BEFORE sorting, so it sees business and personal
 * rows alike — it is about the batch in front of them, not the books.
 *
 * Since v0.6 these are structured facts, not English sentences: the lib
 * owns the arithmetic and the component owns the words. A sentence built
 * here is how English leaked onto ES and PT screens.
 */

const RUNS = { numRuns: 500 };

const find = <K extends Insight["key"]>(
  insights: Insight[],
  key: K,
): Extract<Insight, { key: K }> =>
  insights.find((i) => i.key === key) as Extract<Insight, { key: K }>;

describe("the shape of the payoff", () => {
  it("says nothing at all about an empty batch", () => {
    expect(buildInsights([])).toEqual([]);
  });

  it("always answers all three questions for a batch with anything in it", () => {
    fc.assert(
      fc.property(transactionsArb().filter((rows) => rows.length > 0), (rows) => {
        expect(buildInsights(rows).map((i) => i.key)).toEqual([
          "period",
          "busiest",
          "payer",
        ]);
      }),
      RUNS,
    );
  });

  it("returns facts, never prose — nothing here is a sentence to translate", () => {
    const insights = buildInsights([txn()]);
    for (const insight of insights) {
      for (const value of Object.values(insight)) {
        if (typeof value === "string") {
          expect(value.includes(" ")).toBe(
            // Only payer names and dates are strings, and a name may have a
            // space in it; what must never appear is a built sentence.
            value === "Rosa Delgado",
          );
        }
      }
    }
  });
});

describe("the period fact", () => {
  it("counts payments and expenses separately and never blends their money", () => {
    const rows = [
      txn({ id: "a", amountCents: 10_000, direction: "in" }),
      txn({ id: "b", amountCents: 2_500, direction: "out" }),
      txn({ id: "c", amountCents: 5_000, direction: "in" }),
    ];
    expect(find(buildInsights(rows), "period")).toMatchObject({
      totalCents: 15_000,
      payments: 2,
      expenses: 1,
      spentCents: 2_500,
    });
  });

  it("reports the first and last readable date, ignoring the unreadable ones", () => {
    const rows = [
      txn({ id: "a", date: "2026-07-19" }),
      txn({ id: "b", date: "" }),
      txn({ id: "c", date: "2026-07-04" }),
    ];
    expect(find(buildInsights(rows), "period")).toMatchObject({
      firstDate: "2026-07-04",
      lastDate: "2026-07-19",
    });
  });

  it("reports no dates at all rather than an empty string when none could be read", () => {
    const period = find(buildInsights([txn({ date: "" })]), "period");
    expect(period.firstDate).toBeNull();
    expect(period.lastDate).toBeNull();
  });

  it("reports the same day twice for a single-day batch, which is how the component knows", () => {
    const period = find(buildInsights([txn({ date: "2026-07-04" })]), "period");
    expect(period.firstDate).toBe("2026-07-04");
    expect(period.lastDate).toBe("2026-07-04");
  });

  it("adds the income up exactly, whatever the batch", () => {
    fc.assert(
      fc.property(transactionsArb().filter((r) => r.length > 0), (rows) => {
        const period = find(buildInsights(rows), "period");
        const income = rows.filter((tx) => tx.direction !== "out");
        expect(period.totalCents).toBe(
          income.reduce((sum, tx) => sum + tx.amountCents, 0),
        );
        expect(period.payments).toBe(income.length);
        expect(period.expenses).toBe(rows.length - income.length);
      }),
      RUNS,
    );
  });
});

describe("the busiest-day fact", () => {
  it("picks the day with the most payments", () => {
    const rows = [
      txn({ id: "a", date: "2026-07-04", amountCents: 1_000 }),
      txn({ id: "b", date: "2026-07-04", amountCents: 1_000 }),
      txn({ id: "c", date: "2026-07-05", amountCents: 9_000 }),
    ];
    expect(find(buildInsights(rows), "busiest")).toEqual({
      key: "busiest",
      kind: "busiest",
      date: "2026-07-04",
      count: 2,
      cents: 2_000,
    });
  });

  it("says 'best' instead when every day ties at one payment, and picks the top earner", () => {
    const rows = [
      txn({ id: "a", date: "2026-07-04", amountCents: 1_000 }),
      txn({ id: "b", date: "2026-07-05", amountCents: 9_000 }),
    ];
    expect(find(buildInsights(rows), "busiest")).toMatchObject({
      kind: "best",
      date: "2026-07-05",
      count: 1,
      cents: 9_000,
    });
  });

  it("breaks a tie on money, then on the earlier date, so the answer never wobbles", () => {
    const rows = [
      txn({ id: "a", date: "2026-07-05", amountCents: 1_000 }),
      txn({ id: "b", date: "2026-07-05", amountCents: 1_000 }),
      txn({ id: "c", date: "2026-07-04", amountCents: 1_000 }),
      txn({ id: "d", date: "2026-07-04", amountCents: 1_000 }),
    ];
    expect(find(buildInsights(rows), "busiest").date).toBe("2026-07-04");
  });

  it("keeps expenses out — a day of spending is not a busy day", () => {
    const rows = [
      txn({ id: "a", date: "2026-07-04", direction: "out", amountCents: 9_000 }),
      txn({ id: "b", date: "2026-07-05", amountCents: 1_000 }),
    ];
    expect(find(buildInsights(rows), "busiest").date).toBe("2026-07-05");
  });

  it("says the batch had no income rather than claiming the dates were unreadable", () => {
    const rows = [txn({ direction: "out", date: "2026-07-04" })];
    expect(find(buildInsights(rows), "busiest")).toMatchObject({
      kind: "noIncome",
      date: null,
    });
  });

  it("says the dates were unreadable when that is actually what happened", () => {
    expect(find(buildInsights([txn({ date: "" })]), "busiest")).toMatchObject({
      kind: "noDates",
      date: null,
    });
  });
});

describe("the top-payer fact", () => {
  it("adds a payer's payments up across the batch, however they capitalized it", () => {
    const rows = [
      txn({ id: "a", payer: "Rosa Delgado", amountCents: 6_000 }),
      txn({ id: "b", payer: "rosa delgado", amountCents: 4_000 }),
      txn({ id: "c", payer: "Mike", amountCents: 9_000 }),
    ];
    expect(find(buildInsights(rows), "payer")).toMatchObject({
      kind: "top",
      name: "Rosa Delgado",
      count: 2,
      cents: 10_000,
    });
  });

  it("ranks by money, then by count, then by name — never by luck", () => {
    const rows = [
      txn({ id: "a", payer: "Zoe", amountCents: 5_000 }),
      txn({ id: "b", payer: "Adam", amountCents: 5_000 }),
    ];
    expect(find(buildInsights(rows), "payer").name).toBe("Adam");
  });

  it("refuses to crown a nameless payer, since those are different people", () => {
    const rows = [
      txn({ id: "a", payer: "", amountCents: 90_000 }),
      txn({ id: "b", payer: "   ", amountCents: 90_000 }),
      txn({ id: "c", payer: "Mike", amountCents: 1_000 }),
    ];
    expect(find(buildInsights(rows), "payer").name).toBe("Mike");
  });

  it("says no names were readable when none were", () => {
    expect(find(buildInsights([txn({ payer: "" })]), "payer")).toMatchObject({
      kind: "noNames",
      name: null,
    });
  });

  it("says the batch had no income when it was all expenses", () => {
    const rows = [txn({ direction: "out", payer: "Home Depot" })];
    expect(find(buildInsights(rows), "payer")).toMatchObject({
      kind: "noIncome",
      name: null,
    });
  });

  it("never reports a payer who paid more than the batch's whole income", () => {
    fc.assert(
      fc.property(transactionsArb().filter((r) => r.length > 0), (rows) => {
        const insights = buildInsights(rows);
        const payer = find(insights, "payer");
        const period = find(insights, "period");
        expect(payer.cents).toBeLessThanOrEqual(period.totalCents);
        expect(payer.count).toBeLessThanOrEqual(period.payments);
      }),
      RUNS,
    );
  });
});
