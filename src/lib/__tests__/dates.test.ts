import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { dayLabel, groupByDay } from "../history";
import { dueRecap, inTaxSeason, previousMonth } from "../recap";
import { quarterIncomeCents, quarterOf, setAsideCents } from "../setaside";
import { isoDateArb, txn } from "./arbitraries";

/**
 * Every date in this product is a YYYY-MM-DD string and every comparison
 * is made in UTC, on purpose: the owner's phone can be in any timezone and
 * a job logged on the 31st must not become the 1st because a Date object
 * was built in local time. These tests walk the boundaries that break that
 * — month ends, year ends, February 29, and both daylight-saving switches.
 */

const RUNS = { numRuns: 500 };

describe("which month came before this one", () => {
  it("steps back a month, and back a year in January", () => {
    expect(previousMonth("2026-08-14")).toBe("2026-07");
    expect(previousMonth("2026-01-01")).toBe("2025-12");
    expect(previousMonth("2026-03-01")).toBe("2026-02");
  });

  it("does not care which day of the month it is", () => {
    expect(previousMonth("2026-08-01")).toBe("2026-07");
    expect(previousMonth("2026-08-31")).toBe("2026-07");
  });

  it("always returns a real month, one step back, for any date", () => {
    fc.assert(
      fc.property(isoDateArb, (today) => {
        const previous = previousMonth(today);
        expect(previous).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
        expect(previous < today.slice(0, 7)).toBe(true);
      }),
      RUNS,
    );
  });
});

describe("last month's recap", () => {
  const july = (over = {}) =>
    txn({ business: true, date: "2026-07-15", amountCents: 10_000, ...over });

  it("adds up last month's business money, in and out separately", () => {
    const rows = [
      july({ id: "a" }),
      july({ id: "b", direction: "out", amountCents: 2_500 }),
      txn({ id: "c", business: true, date: "2026-08-02", amountCents: 99_000 }),
    ];
    expect(dueRecap(rows, "2026-08-14", null)).toEqual({
      month: "2026-07",
      inCents: 10_000,
      outCents: 2_500,
    });
  });

  it("shows nothing when it has already been shown for that month", () => {
    expect(dueRecap([july()], "2026-08-14", "2026-07")).toBeNull();
  });

  it("shows again in the next month, having been shown in the last one", () => {
    expect(dueRecap([july()], "2026-08-14", "2026-06")).not.toBeNull();
  });

  it("shows nothing rather than a recap of zeros, which only trains dismissal", () => {
    expect(dueRecap([], "2026-08-14", null)).toBeNull();
    expect(dueRecap([txn({ business: false, date: "2026-07-15" })], "2026-08-14", null)).toBeNull();
    expect(dueRecap([txn({ business: null, date: "2026-07-15" })], "2026-08-14", null)).toBeNull();
  });

  it("shows a month that had activity even if it nets to zero", () => {
    const rows = [
      july({ id: "a", amountCents: 5_000 }),
      july({ id: "b", direction: "out", amountCents: 5_000 }),
    ];
    expect(dueRecap(rows, "2026-08-14", null)).toEqual({
      month: "2026-07",
      inCents: 5_000,
      outCents: 5_000,
    });
  });

  it("looks at December when today is in January", () => {
    const rows = [txn({ business: true, date: "2025-12-24", amountCents: 4_200 })];
    expect(dueRecap(rows, "2026-01-05", null)).toEqual({
      month: "2025-12",
      inCents: 4_200,
      outCents: 0,
    });
  });
});

describe("the tax-season window is pure date math, not tax logic", () => {
  it("runs from New Year's Day to April 15th inclusive", () => {
    expect(inTaxSeason("2026-01-01")).toBe(true);
    expect(inTaxSeason("2026-03-31")).toBe(true);
    expect(inTaxSeason("2026-04-15")).toBe(true);
  });

  it("closes on April 16th", () => {
    expect(inTaxSeason("2026-04-16")).toBe(false);
    expect(inTaxSeason("2026-04-30")).toBe(false);
  });

  it("stays closed for the rest of the year", () => {
    for (const month of ["05", "06", "07", "08", "09", "10", "11", "12"]) {
      expect(inTaxSeason(`2026-${month}-10`)).toBe(false);
    }
  });
});

describe("which quarter a date falls in", () => {
  it("splits the year into four three-month blocks", () => {
    expect(quarterOf("2026-01-01")).toEqual({
      year: 2026,
      quarter: 1,
      startMonth: "2026-01",
      endMonth: "2026-03",
    });
    expect(quarterOf("2026-12-31")).toEqual({
      year: 2026,
      quarter: 4,
      startMonth: "2026-10",
      endMonth: "2026-12",
    });
  });

  it("puts each boundary month in the quarter it belongs to", () => {
    expect(quarterOf("2026-03-31").quarter).toBe(1);
    expect(quarterOf("2026-04-01").quarter).toBe(2);
    expect(quarterOf("2026-06-30").quarter).toBe(2);
    expect(quarterOf("2026-07-01").quarter).toBe(3);
    expect(quarterOf("2026-09-30").quarter).toBe(3);
    expect(quarterOf("2026-10-01").quarter).toBe(4);
  });

  it("always names a real three-month window", () => {
    fc.assert(
      fc.property(isoDateArb, (date) => {
        const { quarter, startMonth, endMonth } = quarterOf(date);
        expect([1, 2, 3, 4]).toContain(quarter);
        expect(startMonth <= date.slice(0, 7)).toBe(true);
        expect(endMonth >= date.slice(0, 7)).toBe(true);
      }),
      RUNS,
    );
  });
});

describe("this quarter's income, and a quarter of it set aside", () => {
  it("counts business income inside the quarter and nothing else", () => {
    const rows = [
      txn({ id: "a", business: true, date: "2026-07-01", amountCents: 10_000 }),
      txn({ id: "b", business: true, date: "2026-09-30", amountCents: 10_000 }),
      txn({ id: "c", business: true, date: "2026-06-30", amountCents: 99_000 }),
      txn({ id: "d", business: true, date: "2026-10-01", amountCents: 99_000 }),
      txn({ id: "e", business: false, date: "2026-08-01", amountCents: 99_000 }),
      txn({ id: "f", business: null, date: "2026-08-01", amountCents: 99_000 }),
      txn({ id: "g", business: true, date: "2026-08-01", amountCents: 99_000, direction: "out" }),
      txn({ id: "h", business: true, date: "", amountCents: 99_000 }),
    ];
    expect(quarterIncomeCents(rows, "2026-08-14")).toBe(20_000);
  });

  it("sets aside a quarter of it, in whole cents", () => {
    expect(setAsideCents(20_000)).toBe(5_000);
    expect(setAsideCents(1)).toBe(0);
    expect(setAsideCents(2)).toBe(1);
    expect(setAsideCents(3)).toBe(1);
  });

  it("counts nothing in a quarter with no business income", () => {
    expect(quarterIncomeCents([], "2026-08-14")).toBe(0);
    expect(setAsideCents(0)).toBe(0);
  });
});

describe("the day labels on the history screen", () => {
  it("says Today and Yesterday rather than a date", () => {
    expect(dayLabel("2026-08-14", "2026-08-14")).toBe("Today");
    expect(dayLabel("2026-08-13", "2026-08-14")).toBe("Yesterday");
  });

  it("says No date for a row whose date could not be read", () => {
    expect(dayLabel("", "2026-08-14")).toBe("No date");
  });

  it("names the weekday and the day for anything older in the same year", () => {
    expect(dayLabel("2026-07-29", "2026-08-14")).toBe("Wednesday, Jul 29");
  });

  it("adds the year only when it is a different one", () => {
    expect(dayLabel("2025-12-31", "2026-08-14")).toBe("Wednesday, Dec 31, 2025");
  });

  it("says Yesterday across a month end, a year end and the leap day", () => {
    expect(dayLabel("2026-07-31", "2026-08-01")).toBe("Yesterday");
    expect(dayLabel("2025-12-31", "2026-01-01")).toBe("Yesterday");
    expect(dayLabel("2024-02-29", "2024-03-01")).toBe("Yesterday");
  });

  it("says Yesterday across both daylight-saving switches, where a local-time day is 23 or 25 hours long", () => {
    expect(dayLabel("2026-03-07", "2026-03-08")).toBe("Yesterday");
    expect(dayLabel("2026-10-31", "2026-11-01")).toBe("Yesterday");
  });

  it("never labels a day it cannot name", () => {
    fc.assert(
      fc.property(isoDateArb, isoDateArb, (date, today) => {
        const label = dayLabel(date, today);
        expect(label.length).toBeGreaterThan(0);
        expect(label).not.toContain("Invalid");
        expect(label).not.toContain("NaN");
      }),
      RUNS,
    );
  });
});

describe("history groups", () => {
  it("keeps rows still being sorted out of the record entirely", () => {
    const rows = [
      txn({ id: "a", business: true, date: "2026-08-14" }),
      txn({ id: "b", business: null, date: "2026-08-14" }),
    ];
    const groups = groupByDay(rows, "2026-08-14");
    expect(groups).toHaveLength(1);
    expect(groups[0].transactions.map((t) => t.id)).toEqual(["a"]);
  });

  it("puts the newest day first and the undated group last", () => {
    const rows = [
      txn({ id: "a", business: true, date: "" }),
      txn({ id: "b", business: true, date: "2026-08-01" }),
      txn({ id: "c", business: true, date: "2026-08-14" }),
    ];
    expect(groupByDay(rows, "2026-08-14").map((g) => g.date)).toEqual([
      "2026-08-14",
      "2026-08-01",
      "",
    ]);
  });

  it("groups nothing out of an empty ledger", () => {
    expect(groupByDay([], "2026-08-14")).toEqual([]);
  });
});
