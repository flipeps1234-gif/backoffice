import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { dedupe, isDuplicate } from "../extract/dedupe";
import { validateExtraction } from "../extract/validate";
import { MAX_CENTS } from "../transaction";
import { transactionsArb, txn } from "./arbitraries";

/**
 * The two guards between a language model and the ledger.
 *
 * validateExtraction never throws and never lets a malformed row through:
 * a model returning 12.5 cents is a bug, and a negative or absurd value
 * would fail the database's CHECK constraint, which rejects the WHOLE
 * batch insert and loses every row in it.
 *
 * dedupe exists because overlapping screenshots show the same payment
 * twice. Its documented trade-off: two genuinely separate identical
 * payments collapse into one, because a missing row is visible and a
 * silent double-count is not.
 */

const RUNS = { numRuns: 500 };

describe("nothing reaches the sheet until it has been validated", () => {
  it("never throws, whatever the model returns", () => {
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        expect(() => validateExtraction(raw)).not.toThrow();
      }),
      RUNS,
    );
  });

  it("returns an empty result for anything that is not a response object", () => {
    for (const raw of [null, undefined, "text", 42, [], true]) {
      expect(validateExtraction(raw)).toEqual({ transactions: [], warnings: [] });
    }
  });

  it("only ever produces whole cents inside the range the column accepts", () => {
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        for (const tx of validateExtraction(raw).transactions) {
          expect(Number.isInteger(tx.amountCents)).toBe(true);
          expect(tx.amountCents).toBeGreaterThanOrEqual(0);
          expect(tx.amountCents).toBeLessThanOrEqual(MAX_CENTS);
        }
      }),
      RUNS,
    );
  });

  it("drops a row whose amount is fractional, negative, absurd or not a number", () => {
    const bad = [12.5, -1, MAX_CENTS + 1, "600", null, Number.NaN, Number.POSITIVE_INFINITY];
    for (const amountCents of bad) {
      expect(validateExtraction({ transactions: [{ amountCents }] }).transactions).toEqual([]);
    }
  });

  it("keeps a row at either end of the legal range", () => {
    for (const amountCents of [0, MAX_CENTS]) {
      expect(
        validateExtraction({ transactions: [{ amountCents }] }).transactions,
      ).toHaveLength(1);
    }
  });

  it("keeps the rows that parse even when others in the same batch do not", () => {
    const result = validateExtraction({
      transactions: [{ amountCents: 6_000 }, { amountCents: "junk" }, { amountCents: 1 }],
    });
    expect(result.transactions.map((tx) => tx.amountCents)).toEqual([6_000, 1]);
  });

  it("rejects a date that is not a real calendar day", () => {
    const dateOf = (date: unknown) =>
      validateExtraction({ transactions: [{ amountCents: 1, date }] }).transactions[0].date;
    expect(dateOf("2026-07-04")).toBe("2026-07-04");
    expect(dateOf("2026-02-31")).toBe("");
    expect(dateOf("2026-13-01")).toBe("");
    expect(dateOf("07/04/2026")).toBe("");
    expect(dateOf("2026-7-4")).toBe("");
    expect(dateOf(20260704)).toBe("");
    expect(dateOf(undefined)).toBe("");
  });

  it("accepts the leap day in a leap year and refuses it otherwise", () => {
    const dateOf = (date: string) =>
      validateExtraction({ transactions: [{ amountCents: 1, date }] }).transactions[0].date;
    expect(dateOf("2024-02-29")).toBe("2024-02-29");
    expect(dateOf("2026-02-29")).toBe("");
  });

  it("trims the payer and the memo, and accepts their absence", () => {
    const [tx] = validateExtraction({
      transactions: [{ amountCents: 1, payer: "  Rosa  ", memo: "  cash  " }],
    }).transactions;
    expect(tx.payer).toBe("Rosa");
    expect(tx.memo).toBe("cash");
    const [bare] = validateExtraction({ transactions: [{ amountCents: 1 }] }).transactions;
    expect(bare.payer).toBe("");
    expect(bare.memo).toBe("");
  });

  it("treats anything but an explicit 'out' as money in, the safer wrong guess", () => {
    const directionOf = (direction: unknown) =>
      validateExtraction({ transactions: [{ amountCents: 1, direction }] }).transactions[0]
        .direction;
    expect(directionOf("out")).toBe("out");
    expect(directionOf("in")).toBe("in");
    expect(directionOf("OUT")).toBe("in");
    expect(directionOf(undefined)).toBe("in");
    expect(directionOf("expense")).toBe("in");
  });

  it("marks every extracted row as coming from a screenshot and as unsorted", () => {
    const [tx] = validateExtraction({ transactions: [{ amountCents: 1 }] }).transactions;
    expect(tx.source).toBe("screenshot");
    expect(tx.business).toBeNull();
    expect(tx.serviceId).toBeNull();
    expect(tx.matchedSaleId).toBeNull();
    expect(tx.category).toBeNull();
  });

  it("clamps confidence into nought-to-one and drops what is not a number", () => {
    const [tx] = validateExtraction({
      transactions: [
        { amountCents: 1, confidence: { payer: 5, amountCents: -2, date: "high" } },
      ],
    }).transactions;
    expect(tx.confidence.payer).toBe(1);
    expect(tx.confidence.amountCents).toBe(0);
    expect(tx.confidence.date).toBeUndefined();
  });

  it("keeps only the warning codes the app knows how to show", () => {
    const result = validateExtraction({
      transactions: [],
      warnings: [
        { code: "unreadable", filename: "a.png" },
        { code: "invented_code" },
        "not an object",
        { code: "no_amounts_visible" },
      ],
    });
    expect(result.warnings).toEqual([
      { code: "unreadable", filename: "a.png" },
      { code: "no_amounts_visible" },
    ]);
  });
});

describe("overlapping screenshots collapse into one payment", () => {
  it("treats the same amount, day and person as one payment", () => {
    const a = txn({ id: "a", payer: "Maria  Santos", amountCents: 6_000, date: "2026-07-04" });
    const b = txn({ id: "b", payer: "maria santos", amountCents: 6_000, date: "2026-07-04" });
    expect(isDuplicate(a, b)).toBe(true);
    expect(dedupe([a, b])).toHaveLength(1);
  });

  it("forgives the OCR slips that turn 'rn' into 'm'", () => {
    const a = txn({ id: "a", payer: "Marina Cruz" });
    const b = txn({ id: "b", payer: "Manna Cruz" });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("keeps two different people apart even at the same amount and day", () => {
    const a = txn({ id: "a", payer: "Rosa Delgado" });
    const b = txn({ id: "b", payer: "Maria Lopez" });
    expect(isDuplicate(a, b)).toBe(false);
    expect(dedupe([a, b])).toHaveLength(2);
  });

  it("keeps money in and money out apart even when everything else matches", () => {
    const a = txn({ id: "a", direction: "in" });
    const b = txn({ id: "b", direction: "out" });
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("keeps one cent of difference apart", () => {
    expect(isDuplicate(txn({ amountCents: 6_000 }), txn({ amountCents: 6_001 }))).toBe(false);
  });

  it("treats a missing date as 'unreadable', not as a different day", () => {
    // The same payment can appear once with its date and once without.
    const dated = txn({ id: "a", date: "2026-07-04" });
    const undated = txn({ id: "b", date: "" });
    expect(isDuplicate(dated, undated)).toBe(true);
    expect(isDuplicate(dated, txn({ id: "c", date: "2026-07-05" }))).toBe(false);
  });

  it("keeps the copy that has a readable date, whatever the confidence scores say", () => {
    const undatedConfident = txn({
      id: "confident",
      date: "",
      confidence: { payer: 1, amountCents: 1, date: 1 },
    });
    const datedUnsure = txn({
      id: "dated",
      date: "2026-07-04",
      confidence: { payer: 0.2, amountCents: 0.2, date: 0.2 },
    });
    expect(dedupe([undatedConfident, datedUnsure])[0].id).toBe("dated");
    expect(dedupe([datedUnsure, undatedConfident])[0].id).toBe("dated");
  });

  it("otherwise keeps the copy the model was most sure about", () => {
    const unsure = txn({ id: "unsure", confidence: { payer: 0.3, amountCents: 0.3 } });
    const sure = txn({ id: "sure", confidence: { payer: 0.95, amountCents: 0.95 } });
    expect(dedupe([unsure, sure])[0].id).toBe("sure");
    expect(dedupe([sure, unsure])[0].id).toBe("sure");
  });

  it("keeps the winner in the position the first copy held, so the batch order is stable", () => {
    const first = txn({ id: "first", payer: "Ana", amountCents: 100 });
    const other = txn({ id: "other", payer: "Beto", amountCents: 200 });
    const better = txn({ id: "better", payer: "Ana", amountCents: 100, confidence: { payer: 1 } });
    expect(dedupe([first, other, better]).map((t) => t.id)).toEqual(["better", "other"]);
  });

  it("never invents a row and never returns more than it was given", () => {
    fc.assert(
      fc.property(transactionsArb(), (batch) => {
        const kept = dedupe(batch);
        expect(kept.length).toBeLessThanOrEqual(batch.length);
        for (const tx of kept) expect(batch).toContain(tx);
      }),
      RUNS,
    );
  });

  it("leaves a batch with nothing to collapse exactly as it was", () => {
    const batch = [
      txn({ id: "a", payer: "Ana", amountCents: 100 }),
      txn({ id: "b", payer: "Beto", amountCents: 200 }),
      txn({ id: "c", payer: "Caio", amountCents: 300 }),
    ];
    expect(dedupe(batch)).toEqual(batch);
  });

  it("collapses nothing in an empty batch", () => {
    expect(dedupe([])).toEqual([]);
  });
});

/**
 * The dedupe rule is FUZZY, and fuzzy relations are not transitive: A can
 * look like B and B like C while A and C look nothing alike. These tests
 * pin down what that actually costs, rather than assuming it away.
 */
describe("what fuzzy matching costs", () => {
  it("compares each new row against the copy currently held, not the one it replaced", () => {
    // "Ana" ~ "Anna" ~ "Anne", but "Ana" and "Anne" are two edits apart.
    const first = txn({ id: "ana", payer: "Ana", confidence: { payer: 0.1 } });
    const middle = txn({ id: "anna", payer: "Anna", confidence: { payer: 0.9 } });
    const last = txn({ id: "anne", payer: "Anne", confidence: { payer: 0.5 } });
    const kept = dedupe([first, middle, last]);
    // All three are within the allowance of whichever copy is held, so they
    // collapse into one. Recorded as the current behavior.
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe("anna");
  });

  it("holds at most one copy per payment, so a later row can never re-split an earlier collapse", () => {
    fc.assert(
      fc.property(transactionsArb(), (batch) => {
        const kept = dedupe(batch);
        const ids = kept.map((tx) => tx.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      RUNS,
    );
  });
});
