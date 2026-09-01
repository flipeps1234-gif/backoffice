import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  EXPECTED_FLAG_DAYS,
  MAX_CENTS,
  OWED_FLAG_DAYS,
  owedCents,
  receivedCents,
  saleAgeDays,
  saleProvenance,
  saleTotalCents,
  validateLineItems,
  type Sale,
  type SaleState,
} from "../sale";
import { lineFromService } from "../sale";
import { item, sale, salesArb, service } from "./arbitraries";

/**
 * LAW 3 — owed never blends into revenue.
 *
 * A sale is in exactly one of three states, and the state decides which of
 * the two figures on the home screen it belongs to. EXPECTED counts as
 * RECEIVED on purpose: the owner has said the money arrived and the
 * matching engine's job is to corroborate them, not to doubt them on
 * screen. The two figures must always partition the book — every cent in
 * exactly one of them, no cent in both.
 */

const RUNS = { numRuns: 1_000 };

const total = (sales: Sale[]): number =>
  sales.reduce((sum, s) => sum + saleTotalCents(s), 0);

describe("the received/owed split partitions the book", () => {
  it("puts every cent in exactly one of the two figures", () => {
    fc.assert(
      fc.property(salesArb(), (sales) => {
        expect(receivedCents(sales) + owedCents(sales)).toBe(total(sales));
      }),
      RUNS,
    );
  });

  it("never lets an open sale contribute to revenue", () => {
    fc.assert(
      fc.property(salesArb(), (sales) => {
        const open = sales.filter((s) => s.state === "open");
        expect(owedCents(sales)).toBe(total(open));
        expect(receivedCents(sales)).toBe(total(sales) - total(open));
      }),
      RUNS,
    );
  });

  it("never lets a paid sale contribute to owed", () => {
    fc.assert(
      fc.property(salesArb(), (sales) => {
        const settled = sales.filter((s) => s.state !== "open");
        expect(owedCents(sales)).toBe(total(sales) - total(settled));
      }),
      RUNS,
    );
  });

  it("counts EXPECTED as received, because the owner said the money arrived", () => {
    const sales = [
      sale({ id: "a", state: "expected", lineItems: [item({ unitCents: 12_000 })] }),
      sale({ id: "b", state: "open", lineItems: [item({ unitCents: 5_000 })] }),
      sale({ id: "c", state: "paid", lineItems: [item({ unitCents: 7_000 })] }),
    ];
    expect(receivedCents(sales)).toBe(19_000);
    expect(owedCents(sales)).toBe(5_000);
  });

  it("reports zero on an empty book rather than undefined", () => {
    expect(receivedCents([])).toBe(0);
    expect(owedCents([])).toBe(0);
  });
});

/**
 * The state table, written out so it doubles as documentation. src/lib
 * holds the MEANING of each state; the transitions themselves are applied
 * by the app layer (a conditional UPDATE that only moves a sale out of
 * open/expected — see upload-screen.tsx), which is outside this suite's
 * scope. What the library must guarantee is that whatever state a row is
 * in, the two figures still partition correctly — including for a row that
 * arrived in a state no legal transition should have produced.
 */
describe("what each state means for the money", () => {
  const cases: {
    state: SaleState;
    counts: "received" | "owed";
  }[] = [
    { state: "open", counts: "owed" },
    { state: "expected", counts: "received" },
    { state: "paid", counts: "received" },
  ];

  for (const { state, counts } of cases) {
    it(`a ${state} sale counts toward ${counts} and nothing else`, () => {
      const one = [sale({ state, lineItems: [item({ unitCents: 4_200 })] })];
      expect(receivedCents(one)).toBe(counts === "received" ? 4_200 : 0);
      expect(owedCents(one)).toBe(counts === "owed" ? 4_200 : 0);
    });
  }

  const transitions: [SaleState, SaleState, string][] = [
    ["open", "paid", "cash marked by hand, or the engine linked a payment"],
    ["open", "expected", "the owner said they were paid digitally"],
    ["expected", "paid", "a payment finally corroborated it, or it was cash after all"],
    ["expected", "open", "the resolve sheet said it was never actually paid"],
    ["paid", "open", "an undo of an auto-match"],
    ["paid", "expected", "an undo back to a merely-asserted payment"],
  ];

  for (const [from, to, why] of transitions) {
    it(`moving a sale from ${from} to ${to} (${why}) moves its whole amount, never part of it`, () => {
      const before = [sale({ state: from, lineItems: [item({ unitCents: 9_900 })] })];
      const after = [sale({ state: to, lineItems: [item({ unitCents: 9_900 })] })];
      expect(receivedCents(before) + owedCents(before)).toBe(9_900);
      expect(receivedCents(after) + owedCents(after)).toBe(9_900);
      const movedIntoRevenue = receivedCents(after) - receivedCents(before);
      const leftOwed = owedCents(before) - owedCents(after);
      expect(movedIntoRevenue).toBe(leftOwed);
    });
  }

  it("keeps the partition intact even for a row in a state the flow should never produce", () => {
    const impossible = [
      sale({ state: "open", method: "digital", matchedTxnId: "t1" }),
      sale({ state: "paid", method: null, matchedTxnId: null }),
      sale({ state: "expected", method: "cash" }),
    ];
    expect(receivedCents(impossible) + owedCents(impossible)).toBe(total(impossible));
  });
});

describe("age flags", () => {
  it("counts whole days between the sale and today", () => {
    expect(saleAgeDays({ date: "2026-08-01" }, "2026-08-15")).toBe(14);
    expect(saleAgeDays({ date: "2026-08-15" }, "2026-08-15")).toBe(0);
  });

  it("counts a negative age for a sale dated in the future rather than throwing", () => {
    expect(saleAgeDays({ date: "2026-08-20" }, "2026-08-15")).toBe(-5);
  });

  it("counts across a month, a year and a leap day", () => {
    expect(saleAgeDays({ date: "2026-01-31" }, "2026-03-01")).toBe(29);
    expect(saleAgeDays({ date: "2024-02-28" }, "2024-03-01")).toBe(2);
    expect(saleAgeDays({ date: "2025-12-31" }, "2026-01-01")).toBe(1);
  });

  it("counts across a daylight-saving switch without gaining or losing a day", () => {
    // The clocks move on 2026-03-08; UTC math must not notice.
    expect(saleAgeDays({ date: "2026-03-07" }, "2026-03-09")).toBe(2);
    expect(saleAgeDays({ date: "2026-10-31" }, "2026-11-02")).toBe(2);
  });

  it("flags owed and stale-expected sales at the same fourteen days", () => {
    expect(OWED_FLAG_DAYS).toBe(14);
    expect(EXPECTED_FLAG_DAYS).toBe(14);
  });
});

describe("service provenance is stamped only when it means something", () => {
  it("carries the service through for a single-line sale", () => {
    const one = sale({ lineItems: [item({ serviceId: "svc-1", quantity: 1 })] });
    expect(saleProvenance(one)).toEqual({ serviceId: "svc-1", quantity: null });
  });

  it("carries the quantity too when it is not just one of a thing", () => {
    const one = sale({ lineItems: [item({ serviceId: "svc-1", quantity: 2.5 })] });
    expect(saleProvenance(one)).toEqual({ serviceId: "svc-1", quantity: 2.5 });
  });

  it("claims no service for a multi-line sale, which would land under the wrong one", () => {
    const many = sale({
      lineItems: [item({ serviceId: "svc-1" }), item({ serviceId: "svc-2" })],
    });
    expect(saleProvenance(many)).toEqual({ serviceId: null, quantity: null });
  });

  it("claims no service for a custom-amount line", () => {
    const custom = sale({ lineItems: [item({ serviceId: null, quantity: 3 })] });
    expect(saleProvenance(custom)).toEqual({ serviceId: null, quantity: null });
  });

  it("claims nothing at all for an empty sale", () => {
    expect(saleProvenance({ lineItems: [] })).toEqual({
      serviceId: null,
      quantity: null,
    });
  });
});

describe("a line item snapshots the catalog rather than pointing at it", () => {
  it("copies the name, price and cost at the moment of sale", () => {
    const svc = service({ id: "svc-1", name: "Deep clean", pricing: { type: "flat", cents: 12_000 }, costCents: 3_000 });
    expect(lineFromService(svc, 2)).toEqual({
      serviceId: "svc-1",
      name: "Deep clean",
      quantity: 2,
      unitCents: 12_000,
      unitCostCents: 3_000,
    });
  });

  it("keeps the old price after the catalog changes", () => {
    const svc = service({ id: "svc-1", pricing: { type: "flat", cents: 12_000 } });
    const line = lineFromService(svc, 1);
    svc.pricing = { type: "flat", cents: 13_000 };
    expect(line.unitCents).toBe(12_000);
  });
});

describe("line items arriving from the database are validated, never trusted", () => {
  it("drops anything that is not a whole number of cents in range", () => {
    expect(validateLineItems([{ quantity: 1, unitCents: 12.5 }])).toEqual([]);
    expect(validateLineItems([{ quantity: 1, unitCents: -1 }])).toEqual([]);
    expect(validateLineItems([{ quantity: 1, unitCents: MAX_CENTS + 1 }])).toEqual([]);
    expect(validateLineItems([{ quantity: 1, unitCents: "600" }])).toEqual([]);
    expect(validateLineItems([{ quantity: 1, unitCents: Number.NaN }])).toEqual([]);
  });

  it("keeps an amount at either end of the legal range", () => {
    expect(validateLineItems([{ quantity: 1, unitCents: 0 }])).toHaveLength(1);
    expect(validateLineItems([{ quantity: 1, unitCents: MAX_CENTS }])).toHaveLength(1);
  });

  it("drops a line with no usable quantity", () => {
    expect(validateLineItems([{ quantity: 0, unitCents: 100 }])).toEqual([]);
    expect(validateLineItems([{ quantity: -2, unitCents: 100 }])).toEqual([]);
    expect(validateLineItems([{ quantity: "2", unitCents: 100 }])).toEqual([]);
    expect(validateLineItems([{ unitCents: 100 }])).toEqual([]);
  });

  it("keeps a fractional quantity, because rate services really are sold that way", () => {
    expect(validateLineItems([{ quantity: 2.5, unitCents: 100 }])[0].quantity).toBe(2.5);
  });

  it("turns a malformed cost into unknown rather than dropping the sale", () => {
    // What the client paid is data; the margin estimate is decoration.
    const [line] = validateLineItems([
      { quantity: 1, unitCents: 100, unitCostCents: "nonsense" },
    ]);
    expect(line.unitCents).toBe(100);
    expect(line.unitCostCents).toBeNull();
  });

  it("trims the name and accepts a missing one", () => {
    const [line] = validateLineItems([{ quantity: 1, unitCents: 100, name: "  Lawn  " }]);
    expect(line.name).toBe("Lawn");
    expect(validateLineItems([{ quantity: 1, unitCents: 100 }])[0].name).toBe("");
  });

  it("never throws, whatever arrives", () => {
    expect(validateLineItems(null)).toEqual([]);
    expect(validateLineItems("nope")).toEqual([]);
    expect(validateLineItems({})).toEqual([]);
    expect(validateLineItems([null, 7, "x", []])).toEqual([]);
  });

  it("only ever returns whole cents in range, for any input at all", () => {
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        for (const line of validateLineItems(raw)) {
          expect(Number.isInteger(line.unitCents)).toBe(true);
          expect(line.unitCents).toBeGreaterThanOrEqual(0);
          expect(line.unitCents).toBeLessThanOrEqual(MAX_CENTS);
          expect(line.quantity).toBeGreaterThan(0);
          expect(Number.isFinite(line.quantity)).toBe(true);
        }
      }),
      RUNS,
    );
  });
});
