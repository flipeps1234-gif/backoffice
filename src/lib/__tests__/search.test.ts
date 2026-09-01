import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { EMPTY_RESULTS, SEARCH_GROUP_LIMIT, fold, searchAll } from "../search";
import { client, item, sale, txn } from "./arbitraries";

/**
 * One query across clients, sales and payments, because the owner
 * remembers "Rosa" or "120" or "lawn", not which screen a thing lives on.
 *
 * Matching is every-token-must-appear, substring, case- and accent-blind.
 * No fuzzy distance here: search is a lookup, not the matching engine. A
 * wrong hit costs a tap, so precision beats recall.
 */

const RUNS = { numRuns: 300 };

const rosa = client({ id: "c1", name: "Rosa Márquez", notes: "back gate code 4821" });
const mike = client({ id: "c2", name: "Mike", notes: "" });

const data = {
  clients: [rosa, mike],
  sales: [
    sale({
      id: "s1",
      clientId: "c1",
      date: "2026-07-04",
      lineItems: [item({ name: "Lawn mowing", unitCents: 12_050 })],
    }),
    sale({
      id: "s2",
      clientId: "c2",
      date: "2026-08-01",
      lineItems: [item({ name: "Deep clean", unitCents: 6_000 })],
    }),
  ],
  transactions: [
    txn({ id: "t1", payer: "Rosa Márquez", memo: "zelle", amountCents: 12_050, date: "2026-07-04" }),
    txn({ id: "t2", payer: "Mike", memo: "cash", amountCents: 6_000, date: "2026-08-01" }),
  ],
};

describe("folding", () => {
  it("strips accents and case so a one-handed query still lands", () => {
    expect(fold("José")).toBe("jose");
    expect(fold("MÁRQUEZ")).toBe("marquez");
    expect(fold("Ñandú")).toBe("nandu");
  });

  it("leaves text with nothing to fold alone", () => {
    expect(fold("lawn mowing")).toBe("lawn mowing");
    expect(fold("")).toBe("");
  });
});

describe("what a query finds", () => {
  it("finds a client, their sale and their payment from one name", () => {
    const results = searchAll("rosa", data);
    expect(results.clients.map((c) => c.id)).toEqual(["c1"]);
    expect(results.sales.map((s) => s.id)).toEqual(["s1"]);
    expect(results.transactions.map((t) => t.id)).toEqual(["t1"]);
  });

  it("finds an accented name typed without accents, and the reverse", () => {
    expect(searchAll("marquez", data).clients.map((c) => c.id)).toEqual(["c1"]);
    expect(searchAll("márquez", data).clients.map((c) => c.id)).toEqual(["c1"]);
  });

  it("requires every token to appear, so a second word narrows rather than widens", () => {
    expect(searchAll("rosa lawn", data).sales.map((s) => s.id)).toEqual(["s1"]);
    expect(searchAll("rosa deep", data).sales).toEqual([]);
  });

  it("searches a client's notes as well as their name", () => {
    expect(searchAll("4821", data).clients.map((c) => c.id)).toEqual(["c1"]);
  });

  it("searches a payment's memo and a sale's line items", () => {
    expect(searchAll("zelle", data).transactions.map((t) => t.id)).toEqual(["t1"]);
    expect(searchAll("mowing", data).sales.map((s) => s.id)).toEqual(["s1"]);
  });

  it("finds a sale by the client's name even though the name is not on the sale", () => {
    expect(searchAll("mike", data).sales.map((s) => s.id)).toEqual(["s2"]);
  });

  it("finds things by date", () => {
    expect(searchAll("2026-07-04", data).sales.map((s) => s.id)).toEqual(["s1"]);
  });

  it("finds nothing for a query that matches nothing, rather than everything", () => {
    expect(searchAll("nonexistent", data)).toEqual({
      clients: [],
      sales: [],
      transactions: [],
    });
  });

  it("treats an empty or whitespace query as no search at all", () => {
    expect(searchAll("", data)).toBe(EMPTY_RESULTS);
    expect(searchAll("   ", data)).toBe(EMPTY_RESULTS);
  });
});

describe("money the way the owner writes it finds money the way we store it", () => {
  it("finds an amount typed as whole dollars or with cents", () => {
    expect(searchAll("120", data).sales.map((s) => s.id)).toEqual(["s1"]);
    expect(searchAll("120.50", data).sales.map((s) => s.id)).toEqual(["s1"]);
  });

  it("ignores a dollar sign the owner copied off the screen", () => {
    expect(searchAll("$120.50", data).sales.map((s) => s.id)).toEqual(["s1"]);
  });

  it("reads en-US thousands grouping the app itself displays", () => {
    const big = {
      ...data,
      sales: [
        sale({ id: "s9", clientId: "c1", lineItems: [item({ unitCents: 123_456 })] }),
      ],
    };
    expect(searchAll("$1,234.56", big).sales.map((s) => s.id)).toEqual(["s9"]);
  });

  it("reads the pt-BR and es forms the entry fields already accept", () => {
    expect(searchAll("120,50", data).sales.map((s) => s.id)).toEqual(["s1"]);
    const big = {
      ...data,
      sales: [
        sale({ id: "s9", clientId: "c1", lineItems: [item({ unitCents: 123_456 })] }),
      ],
    };
    expect(searchAll("1.234,56", big).sales.map((s) => s.id)).toEqual(["s9"]);
  });

  it("finds a payment by its amount as well as a sale", () => {
    expect(searchAll("60.00", data).transactions.map((t) => t.id)).toEqual(["t2"]);
  });
});

describe("the results are a lookup, not a report", () => {
  it("puts the newest sale and payment first, since that is what is being hunted", () => {
    const results = searchAll("2026", data);
    expect(results.sales.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(results.transactions.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("caps each group so the answer stays a list", () => {
    const many = {
      clients: Array.from({ length: 20 }, (_, i) => client({ id: `c${i}`, name: `Rosa ${i}` })),
      sales: Array.from({ length: 20 }, (_, i) =>
        sale({ id: `s${i}`, clientId: null, lineItems: [item({ name: "Rosa job" })] }),
      ),
      transactions: Array.from({ length: 20 }, (_, i) =>
        txn({ id: `t${i}`, payer: "Rosa" }),
      ),
    };
    const results = searchAll("rosa", many);
    expect(SEARCH_GROUP_LIMIT).toBe(8);
    expect(results.clients).toHaveLength(8);
    expect(results.sales).toHaveLength(8);
    expect(results.transactions).toHaveLength(8);
  });

  it("never returns more than it was given, for any query at all", () => {
    fc.assert(
      fc.property(fc.string(), (query) => {
        const results = searchAll(query, data);
        expect(results.clients.length).toBeLessThanOrEqual(data.clients.length);
        expect(results.sales.length).toBeLessThanOrEqual(data.sales.length);
        expect(results.transactions.length).toBeLessThanOrEqual(data.transactions.length);
        for (const c of results.clients) expect(data.clients).toContain(c);
      }),
      RUNS,
    );
  });

  it("searches an empty book without complaint", () => {
    expect(searchAll("rosa", { clients: [], sales: [], transactions: [] })).toEqual({
      clients: [],
      sales: [],
      transactions: [],
    });
  });
});
