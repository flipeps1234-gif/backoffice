import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { lineTotalCents, saleMarginCents, saleTotalCents } from "../sale";
import { priceFor } from "../service";
import { setAsideCents } from "../setaside";
import { formatMiles, parseMilesToTenths } from "../mileage";
import {
  MAX_CENTS,
  centsToDollars,
  dollarsToCents,
  totalCents,
  totalsByDirection,
} from "../transaction";
import {
  centsArb,
  item,
  lineItemArb,
  saleArb,
  serviceArb,
  smallCentsArb,
  transactionsArb,
} from "./arbitraries";

/**
 * LAW 1 — all money is integer cents.
 *
 * Every amount that enters the ledger goes through dollarsToCents, and
 * every amount that leaves an engine is the sum or product of amounts that
 * did. A fractional cent anywhere is a money bug, and a NaN is a money bug
 * that spreads: one NaN in a reduce turns a whole dashboard into NaN.
 */

const RUNS = { numRuns: 1_000 };

const isWholeCents = (value: number): boolean =>
  Number.isInteger(value) && Number.isFinite(value);

describe("dollarsToCents — the only door money enters through", () => {
  it("reads en-US dollars", () => {
    expect(dollarsToCents("12.34")).toBe(1234);
    expect(dollarsToCents("$1,234.56")).toBe(123456);
    expect(dollarsToCents("0.50")).toBe(50);
  });

  it("reads es and pt-BR comma decimals, so a Brazilian typing 1.234,56 is not charged $1.23", () => {
    expect(dollarsToCents("12,34")).toBe(1234);
    expect(dollarsToCents("1.234,56")).toBe(123456);
    expect(dollarsToCents("12,5")).toBe(1250);
  });

  it("treats a lone separator with three digits after it as thousands grouping, in either notation", () => {
    expect(dollarsToCents("1,234")).toBe(123400);
    expect(dollarsToCents("1.234")).toBe(123400);
    expect(dollarsToCents("12,345")).toBe(1234500);
  });

  // The module's own worked example says "1.234.567" → 123456700, which is
  // above MAX_CENTS and so cannot come out of this function. The clamp wins.
  // Stale comment, not a money bug — BUGS.md #2.
  it("clamps the multi-group example its own documentation gives", () => {
    expect(dollarsToCents("1.234.567")).toBe(MAX_CENTS);
  });

  it("treats a zero whole part as a decimal even with three digits, so a 0.125/sq ft rate is not $125", () => {
    expect(dollarsToCents("0.125")).toBe(13);
    expect(dollarsToCents("0,125")).toBe(13);
    expect(dollarsToCents("0.999")).toBe(100);
  });

  it("reads nothing out of unparseable text rather than guessing", () => {
    expect(dollarsToCents("")).toBe(0);
    expect(dollarsToCents("abc")).toBe(0);
    expect(dollarsToCents("$")).toBe(0);
  });

  it("has no way to express a negative amount — the minus sign is stripped, not honored", () => {
    expect(dollarsToCents("-5")).toBe(500);
    expect(dollarsToCents("-12.34")).toBe(1234);
  });

  it("clamps anything larger than the column can hold to MAX_CENTS", () => {
    expect(dollarsToCents("99999999.99")).toBe(MAX_CENTS);
    expect(dollarsToCents("1".repeat(400))).toBe(MAX_CENTS);
  });

  it("never returns a fractional cent, a NaN, or a value outside 0..MAX_CENTS, whatever the string", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const cents = dollarsToCents(input);
        expect(isWholeCents(cents)).toBe(true);
        expect(cents).toBeGreaterThanOrEqual(0);
        expect(cents).toBeLessThanOrEqual(MAX_CENTS);
      }),
      RUNS,
    );
  });

  it("never returns a fractional cent for strings built out of digits and separators", () => {
    const moneyish = fc
      .array(fc.constantFrom("0", "1", "9", ".", ",", "$", " "), {
        maxLength: 14,
      })
      .map((parts) => parts.join(""));
    fc.assert(
      fc.property(moneyish, (input) => {
        expect(isWholeCents(dollarsToCents(input))).toBe(true);
      }),
      RUNS,
    );
  });

  it("round-trips every representable amount through its own display form", () => {
    fc.assert(
      fc.property(centsArb, (cents) => {
        expect(dollarsToCents(centsToDollars(cents))).toBe(cents);
      }),
      RUNS,
    );
  });
});

describe("sums and totals stay exact", () => {
  it("totalCents of any ledger is a whole number of cents", () => {
    fc.assert(
      fc.property(transactionsArb(), (transactions) => {
        expect(isWholeCents(totalCents(transactions))).toBe(true);
      }),
      RUNS,
    );
  });

  it("money in and money out partition the ledger — they sum to the whole and never overlap", () => {
    fc.assert(
      fc.property(transactionsArb(), (transactions) => {
        const { inCents, outCents } = totalsByDirection(transactions);
        expect(isWholeCents(inCents)).toBe(true);
        expect(isWholeCents(outCents)).toBe(true);
        expect(inCents + outCents).toBe(totalCents(transactions));
      }),
      RUNS,
    );
  });

  it("an empty ledger totals zero, not undefined or NaN", () => {
    expect(totalCents([])).toBe(0);
    expect(totalsByDirection([])).toEqual({ inCents: 0, outCents: 0 });
  });
});

describe("line items and sale totals round per line, never per batch", () => {
  it("a line total is always whole cents, even at a fractional quantity", () => {
    fc.assert(
      fc.property(lineItemArb, (line) => {
        expect(isWholeCents(lineTotalCents(line))).toBe(true);
      }),
      RUNS,
    );
  });

  it("rounds each line before adding, so a sale total is the sum of what each line displays", () => {
    fc.assert(
      fc.property(saleArb(), (s) => {
        const total = saleTotalCents(s);
        expect(isWholeCents(total)).toBe(true);
        expect(total).toBe(
          s.lineItems.reduce((sum, line) => sum + lineTotalCents(line), 0),
        );
      }),
      RUNS,
    );
  });

  it("rounds half up at the half-cent, the one place a rate service lands between cents", () => {
    // 2.5 units at 1 cent is 2.5 cents; the ledger has to pick one.
    expect(lineTotalCents(item({ unitCents: 1, quantity: 2.5 }))).toBe(3);
    expect(lineTotalCents(item({ unitCents: 1, quantity: 1.5 }))).toBe(2);
  });

  it("a margin is whole cents when every line has a cost, and unknown when any line does not", () => {
    fc.assert(
      fc.property(saleArb(), (s) => {
        const margin = saleMarginCents(s);
        const anyUnknown = s.lineItems.some((l) => l.unitCostCents === null);
        if (anyUnknown) {
          expect(margin).toBeNull();
        } else {
          expect(isWholeCents(margin as number)).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it("an empty sale totals zero and has a zero margin, not undefined", () => {
    expect(saleTotalCents({ lineItems: [] })).toBe(0);
    expect(saleMarginCents({ lineItems: [] })).toBe(0);
  });
});

describe("the catalog's mini-calc", () => {
  it("prices any service and quantity in whole cents", () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.double({ min: 0.1, max: 5_000, noNaN: true }),
        (svc, quantity) => {
          expect(isWholeCents(priceFor(svc, quantity))).toBe(true);
        },
      ),
      RUNS,
    );
  });

  it("refuses to price a nonsense quantity rather than returning NaN", () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.constantFrom(0, -1, -0.5, Number.NaN, Number.POSITIVE_INFINITY),
        (svc, quantity) => {
          const price = priceFor(svc, quantity);
          expect(Number.isNaN(price)).toBe(false);
          if (svc.pricing.type === "rate") expect(price).toBe(0);
        },
      ),
      RUNS,
    );
  });

  it("ignores quantity entirely for a flat price — a flat service costs what it costs", () => {
    const svc = { id: "s", name: "Deep clean", pricing: { type: "flat" as const, cents: 12_000 }, costCents: null };
    expect(priceFor(svc, 1)).toBe(12_000);
    expect(priceFor(svc, 9.7)).toBe(12_000);
    expect(priceFor(svc, 0)).toBe(12_000);
  });
});

describe("the quarterly set-aside is integer arithmetic, not a tax engine", () => {
  it("is exactly a quarter of the income, rounded to a whole cent", () => {
    fc.assert(
      fc.property(centsArb, (income) => {
        const aside = setAsideCents(income);
        expect(isWholeCents(aside)).toBe(true);
        expect(Math.abs(aside * 4 - income)).toBeLessThanOrEqual(2);
      }),
      RUNS,
    );
  });

  it("sets aside nothing on no income", () => {
    expect(setAsideCents(0)).toBe(0);
  });
});

describe("distance is integer tenths, the same philosophy as cents", () => {
  it("round-trips every recordable distance through its display form", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99_999 }), (tenths) => {
        expect(parseMilesToTenths(formatMiles(tenths))).toBe(tenths);
      }),
      RUNS,
    );
  });

  it("returns whole tenths or nothing at all, never a fraction of a tenth", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const tenths = parseMilesToTenths(input);
        if (tenths !== null) {
          expect(Number.isInteger(tenths)).toBe(true);
          expect(tenths).toBeGreaterThan(0);
          expect(tenths).toBeLessThanOrEqual(99_999);
        }
      }),
      RUNS,
    );
  });

  it("treats zero and unreadable distances as never set", () => {
    expect(parseMilesToTenths("0")).toBeNull();
    expect(parseMilesToTenths("")).toBeNull();
    expect(parseMilesToTenths("abc")).toBeNull();
  });

  // CURRENT BEHAVIOR, and a discrepancy — see BUGS.md #1. The minus sign is
  // stripped before parsing, so the module's own `miles <= 0` rejection can
  // only ever fire on a literal zero. A typed "-4" becomes 4.0 miles.
  it("strips a minus sign instead of rejecting it, so a negative distance reads as positive", () => {
    expect(parseMilesToTenths("-4")).toBe(40);
    expect(parseMilesToTenths("-0.5")).toBe(5);
  });

  it("reads a comma decimal, because the same owner types both ways", () => {
    expect(parseMilesToTenths("12,5")).toBe(125);
    expect(parseMilesToTenths("12.5")).toBe(125);
  });
});

describe("large amounts stay exact", () => {
  it("adds thousands of maximum-sized amounts without a float artifact", () => {
    fc.assert(
      fc.property(
        fc.array(smallCentsArb, { minLength: 100, maxLength: 400 }),
        (amounts) => {
          const sum = amounts.reduce((a, b) => a + b, 0);
          expect(Number.isSafeInteger(sum)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
