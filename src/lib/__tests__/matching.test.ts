import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  MATCH_WINDOW_DAYS,
  matchBatch,
  sameName,
  txnCandidatesForSale,
} from "../matching";
import {
  clientArb,
  client,
  item,
  sale,
  salesArb,
  transactionsArb,
  txn,
} from "./arbitraries";

/**
 * LAW 2 — one payment, one sale.
 *
 * The engine's whole job is to link an ingested payment to the sale it
 * settles. Linking one payment to two sales double-counts revenue; linking
 * two payments to one sale hides money. Neither may happen for ANY input,
 * in ANY order, which is why the first block here is a property and not an
 * example.
 */

const RUNS = { numRuns: 500 };

const rosa = client({ id: "c1", name: "Rosa Delgado" });

describe("no double-matching, whatever the batch contains", () => {
  it("never links one payment to more than one sale", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        salesArb(),
        fc.array(clientArb, { maxLength: 4 }),
        (batch, sales, clients) => {
          const { links } = matchBatch(batch, sales, clients);
          const txnIds = links.map((l) => l.txnId);
          expect(new Set(txnIds).size).toBe(txnIds.length);
        },
      ),
      RUNS,
    );
  });

  it("never links one sale to more than one payment", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        salesArb(),
        fc.array(clientArb, { maxLength: 4 }),
        (batch, sales, clients) => {
          const { links } = matchBatch(batch, sales, clients);
          const saleIds = links.map((l) => l.saleId);
          expect(new Set(saleIds).size).toBe(saleIds.length);
        },
      ),
      RUNS,
    );
  });

  it("puts a payment in exactly one place — linked, or suggested, or neither", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        salesArb(),
        fc.array(clientArb, { maxLength: 4 }),
        (batch, sales, clients) => {
          const { links, suggestions } = matchBatch(batch, sales, clients);
          const linked = new Set(links.map((l) => l.txnId));
          for (const suggestion of suggestions) {
            expect(linked.has(suggestion.txnId)).toBe(false);
          }
          const suggested = suggestions.map((s) => s.txnId);
          expect(new Set(suggested).size).toBe(suggested.length);
        },
      ),
      RUNS,
    );
  });

  it("only ever links sales that were outstanding and payments that were free to be claimed", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        salesArb(),
        fc.array(clientArb, { maxLength: 4 }),
        (batch, sales, clients) => {
          const { links } = matchBatch(batch, sales, clients);
          for (const link of links) {
            const s = sales.find((candidate) => candidate.id === link.saleId)!;
            const t = batch.find((candidate) => candidate.id === link.txnId)!;
            expect(["open", "expected"]).toContain(s.state);
            expect(s.clientId).not.toBeNull();
            expect(t.direction).toBe("in");
            expect(t.matchedSaleId).toBeNull();
            expect(t.business).not.toBe(false);
          }
        },
      ),
      RUNS,
    );
  });

  it("holds the same invariants for every permutation of the same batch", () => {
    fc.assert(
      fc.property(
        transactionsArb(6),
        salesArb(6),
        fc.array(clientArb, { maxLength: 3 }),
        (batch, sales, clients) =>
          fc.assert(
            fc.property(
              fc.shuffledSubarray(batch, {
                minLength: batch.length,
                maxLength: batch.length,
              }),
              (mixed) => {
                const { links } = matchBatch(mixed, sales, clients);
                expect(new Set(links.map((l) => l.saleId)).size).toBe(
                  links.length,
                );
                expect(new Set(links.map((l) => l.txnId)).size).toBe(
                  links.length,
                );
              },
            ),
            { numRuns: 8 },
          ),
      ),
      { numRuns: 200 },
    );
  });
});

describe("what makes a payment and a sale a match", () => {
  it("requires the amount to be exactly equal — there is no tolerance", () => {
    const openSale = sale({ id: "s1", clientId: "c1", lineItems: [item({ unitCents: 6_000 })] });
    expect(matchBatch([txn({ amountCents: 6_000 })], [openSale], [rosa]).links).toHaveLength(1);
    expect(matchBatch([txn({ amountCents: 5_999 })], [openSale], [rosa]).links).toHaveLength(0);
    expect(matchBatch([txn({ amountCents: 6_001 })], [openSale], [rosa]).links).toHaveLength(0);
  });

  it("forgives an OCR slip in the name but not a different person", () => {
    expect(sameName("Sarah Johnson", "Sarah Jonson")).toBe(true);
    expect(sameName("Rosa Delgado", "Rosa Delgada")).toBe(true);
    expect(sameName("Rosa Delgado", "Maria Lopez")).toBe(false);
    expect(sameName("Mike", "Michael")).toBe(false);
  });

  it("matches a first-name client record against the payment app's full name", () => {
    // The bug this rule exists for: a client saved as "Rosa" was permanently
    // unmatchable against "Rosa Delgado", so every digital sale to her
    // double-counted.
    expect(sameName("Rosa", "Rosa Delgado")).toBe(true);
    expect(sameName("Rosa Delgado", "Rosa")).toBe(true);
  });

  it("looks past accents, punctuation and doubled spaces", () => {
    expect(sameName("José Márquez", "Jose Marquez")).toBe(true);
    expect(sameName("Anna-Maria O'Neill", "anna maria oneill")).toBe(true);
    expect(sameName("Rosa  Delgado", "rosa delgado")).toBe(true);
  });

  it("treats a nameless side as no match rather than a match with everyone", () => {
    expect(sameName("", "")).toBe(false);
    expect(sameName("Rosa", "")).toBe(false);
    expect(sameName("", "Rosa")).toBe(false);
  });

  // CURRENT BEHAVIOR: the token-subset rule ignores word order, so a
  // reversed name still matches. Documented here rather than judged — for
  // this product's world it is more often right than wrong.
  it("matches a name whose words are in the other order", () => {
    expect(sameName("chen wei", "Wei Chen")).toBe(true);
  });

  it("accepts a payment up to ten days either side of the sale, and no further", () => {
    const openSale = sale({ id: "s1", clientId: "c1", date: "2026-07-15" });
    const on = (date: string) => matchBatch([txn({ date })], [openSale], [rosa]).links.length;
    expect(MATCH_WINDOW_DAYS).toBe(10);
    expect(on("2026-07-15")).toBe(1);
    expect(on("2026-07-05")).toBe(1);
    expect(on("2026-07-25")).toBe(1);
    expect(on("2026-07-04")).toBe(0);
    expect(on("2026-07-26")).toBe(0);
  });

  it("treats an unreadable date as a wildcard rather than a disqualification", () => {
    const openSale = sale({ id: "s1", clientId: "c1", date: "2020-01-01" });
    expect(matchBatch([txn({ date: "" })], [openSale], [rosa]).links).toHaveLength(1);
  });

  it("matches a payment that arrived before the sale was even logged", () => {
    const openSale = sale({ id: "s1", clientId: "c1", date: "2026-07-15" });
    expect(matchBatch([txn({ date: "2026-07-10" })], [openSale], [rosa]).links).toHaveLength(1);
  });
});

describe("which rows the engine refuses to touch", () => {
  const openSale = sale({ id: "s1", clientId: "c1" });

  it("ignores money going out — an expense cannot settle a sale", () => {
    expect(matchBatch([txn({ direction: "out" })], [openSale], [rosa]).links).toHaveLength(0);
  });

  it("ignores a payment that is already linked to something", () => {
    expect(
      matchBatch([txn({ matchedSaleId: "other" })], [openSale], [rosa]).links,
    ).toHaveLength(0);
  });

  it("ignores a payment the owner sorted as personal", () => {
    expect(matchBatch([txn({ business: false })], [openSale], [rosa]).links).toHaveLength(0);
  });

  it("still matches a payment nobody has sorted yet — the link is itself the evidence", () => {
    expect(matchBatch([txn({ business: null })], [openSale], [rosa]).links).toHaveLength(1);
  });

  it("ignores a sale that is already paid", () => {
    const paid = sale({ id: "s1", clientId: "c1", state: "paid" });
    expect(matchBatch([txn()], [paid], [rosa]).links).toHaveLength(0);
  });

  it("still scans EXPECTED sales — corroborating them is the whole point", () => {
    const expected = sale({ id: "s1", clientId: "c1", state: "expected" });
    expect(matchBatch([txn()], [expected], [rosa]).links).toHaveLength(1);
  });

  it("ignores a sale with nobody attached, since there is no name to match", () => {
    const anonymous = sale({ id: "s1", clientId: null });
    expect(matchBatch([txn()], [anonymous], [rosa]).links).toHaveLength(0);
  });
});

describe("ambiguity is surfaced, never guessed", () => {
  it("sends two identical open sales to the picker instead of choosing one", () => {
    const a = sale({ id: "s1", clientId: "c1" });
    const b = sale({ id: "s2", clientId: "c1" });
    const { links, suggestions } = matchBatch([txn({ id: "t1" })], [a, b], [rosa]);
    expect(links).toHaveLength(0);
    expect(suggestions).toEqual([{ txnId: "t1", saleIds: ["s1", "s2"] }]);
  });

  it("breaks the tie toward the due recurring instance when exactly one qualifies", () => {
    const oneOff = sale({ id: "s1", clientId: "c1" });
    const fromTemplate = sale({ id: "s2", clientId: "c1", recurringTemplateId: "tpl-1" });
    const { links, suggestions } = matchBatch([txn({ id: "t1" })], [oneOff, fromTemplate], [rosa]);
    expect(links).toEqual([{ saleId: "s2", txnId: "t1" }]);
    expect(suggestions).toHaveLength(0);
  });

  it("shows the whole field when the tie-break does not narrow it, not just the preferred subset", () => {
    const a = sale({ id: "s1", clientId: "c1", recurringTemplateId: "tpl-1" });
    const b = sale({ id: "s2", clientId: "c1", recurringTemplateId: "tpl-2" });
    const oneOff = sale({ id: "s3", clientId: "c1" });
    const { links, suggestions } = matchBatch([txn({ id: "t1" })], [a, b, oneOff], [rosa]);
    expect(links).toHaveLength(0);
    expect(suggestions[0].saleIds).toEqual(["s1", "s2", "s3"]);
  });

  it("clears two same-amount sales with two same-amount payments instead of double-linking one", () => {
    const a = sale({ id: "s1", clientId: "c1" });
    const b = sale({ id: "s2", clientId: "c1" });
    const { links, suggestions } = matchBatch(
      [txn({ id: "t1" }), txn({ id: "t2" })],
      [a, b],
      [rosa],
    );
    // Both payments qualify for both sales, so neither is unambiguous.
    expect(links).toHaveLength(0);
    expect(suggestions.map((s) => s.txnId)).toEqual(["t1", "t2"]);
  });

  it("claims greedily once a sale is taken, so a duplicate screenshot cannot settle it twice", () => {
    const only = sale({ id: "s1", clientId: "c1" });
    const { links, suggestions } = matchBatch(
      [txn({ id: "t1" }), txn({ id: "t2" })],
      [only],
      [rosa],
    );
    expect(links).toEqual([{ saleId: "s1", txnId: "t1" }]);
    expect(suggestions).toHaveLength(0);
  });
});

describe("the checkout-time question: which payments could settle THIS sale", () => {
  const target = sale({ id: "s1", clientId: "c1", date: "2026-07-01" });

  it("returns every qualifying payment rather than greedily claiming the first", () => {
    const found = txnCandidatesForSale(
      [txn({ id: "t1", date: "2026-07-01" }), txn({ id: "t2", date: "2026-07-02" })],
      target,
      "Rosa Delgado",
    );
    expect(found.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("applies the same amount, direction and already-linked rules as the batch scan", () => {
    const found = txnCandidatesForSale(
      [
        txn({ id: "wrong-amount", amountCents: 5_999 }),
        txn({ id: "outgoing", direction: "out" }),
        txn({ id: "taken", matchedSaleId: "s9" }),
        txn({ id: "personal", business: false }),
        txn({ id: "good" }),
      ],
      target,
      "Rosa Delgado",
    );
    expect(found.map((t) => t.id)).toEqual(["good"]);
  });

  it("relaxes only the name rule when the owner is looking at the list themselves", () => {
    const stranger = txn({ id: "t1", payer: "Totally Different" });
    expect(txnCandidatesForSale([stranger], target, "Rosa Delgado")).toHaveLength(0);
    expect(
      txnCandidatesForSale([stranger], target, "Rosa Delgado", { relaxName: true }),
    ).toHaveLength(1);
  });

  it("still enforces the date window when the name rule is relaxed", () => {
    const faraway = txn({ id: "t1", payer: "Totally Different", date: "2026-09-30" });
    expect(
      txnCandidatesForSale([faraway], target, "Rosa Delgado", { relaxName: true }),
    ).toHaveLength(0);
  });

  it("finds nothing for a sale nobody could have paid", () => {
    expect(txnCandidatesForSale([], target, "Rosa Delgado")).toEqual([]);
  });
});

describe("edge amounts", () => {
  it("links a zero-amount payment to a zero-amount sale, since the amounts do match", () => {
    const free = sale({ id: "s1", clientId: "c1", lineItems: [item({ unitCents: 0 })] });
    const { links } = matchBatch([txn({ id: "t1", amountCents: 0 })], [free], [rosa]);
    expect(links).toEqual([{ saleId: "s1", txnId: "t1" }]);
  });

  it("tells one cent apart", () => {
    const penny = sale({ id: "s1", clientId: "c1", lineItems: [item({ unitCents: 1 })] });
    expect(matchBatch([txn({ amountCents: 1 })], [penny], [rosa]).links).toHaveLength(1);
    expect(matchBatch([txn({ amountCents: 2 })], [penny], [rosa]).links).toHaveLength(0);
  });

  it("matches at the top of the money range as readily as at the bottom", () => {
    const big = sale({ id: "s1", clientId: "c1", lineItems: [item({ unitCents: 99_999_999 })] });
    expect(matchBatch([txn({ amountCents: 99_999_999 })], [big], [rosa]).links).toHaveLength(1);
  });

  it("adds up a multi-line sale before comparing, not line by line", () => {
    const multi = sale({
      id: "s1",
      clientId: "c1",
      lineItems: [item({ unitCents: 2_000 }), item({ unitCents: 4_000 })],
    });
    expect(matchBatch([txn({ amountCents: 6_000 })], [multi], [rosa]).links).toHaveLength(1);
    expect(matchBatch([txn({ amountCents: 2_000 })], [multi], [rosa]).links).toHaveLength(0);
  });

  it("finds nothing in an empty batch or an empty book", () => {
    expect(matchBatch([], [sale()], [rosa])).toEqual({ links: [], suggestions: [] });
    expect(matchBatch([txn()], [], [rosa])).toEqual({ links: [], suggestions: [] });
    expect(matchBatch([], [], [])).toEqual({ links: [], suggestions: [] });
  });
});
