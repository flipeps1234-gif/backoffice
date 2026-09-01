import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { knownPayers, rememberedFor } from "../customer-memory";
import { formatMiles, mileageLog, totalTenths } from "../mileage";
import {
  rankClientsForProducts,
  rankServicesForClient,
  usualServiceIds,
} from "../recommend";
import { client, item, sale, salesArb, service, txn } from "./arbitraries";

/**
 * Everything here is DERIVED at ask time rather than stored. What Rosa
 * usually pays for lawn mowing is just her most recent lawn-mowing row;
 * her usual services are just what she has bought. A second stored copy
 * would drift from the truth, so there isn't one.
 */

const RUNS = { numRuns: 300 };

describe("what this customer paid last time", () => {
  const rows = [
    txn({ id: "old", payer: "Rosa", serviceId: "svc-1", amountCents: 6_000, date: "2026-06-01" }),
    txn({ id: "new", payer: "rosa", serviceId: "svc-1", amountCents: 6_500, date: "2026-07-01", quantity: 2 }),
  ];

  it("remembers the most recent price for that person and that service", () => {
    expect(rememberedFor(rows, "Rosa", "svc-1")).toEqual({
      amountCents: 6_500,
      quantity: 2,
    });
  });

  it("recognizes the same person however they were capitalized or spaced", () => {
    expect(rememberedFor(rows, "  ROSA  ", "svc-1")?.amountCents).toBe(6_500);
  });

  it("remembers nothing about a person or a service with no history", () => {
    expect(rememberedFor(rows, "Mike", "svc-1")).toBeUndefined();
    expect(rememberedFor(rows, "Rosa", "svc-9")).toBeUndefined();
    expect(rememberedFor([], "Rosa", "svc-1")).toBeUndefined();
  });

  it("refuses to guess from a nameless row", () => {
    expect(rememberedFor(rows, "", "svc-1")).toBeUndefined();
    expect(rememberedFor(rows, "   ", "svc-1")).toBeUndefined();
  });

  it("ignores a personal favour logged against the same chip", () => {
    const withFavour = [
      ...rows,
      txn({ id: "favour", payer: "Rosa", serviceId: "svc-1", amountCents: 0, business: false, date: "2026-08-01" }),
    ];
    expect(rememberedFor(withFavour, "Rosa", "svc-1")?.amountCents).toBe(6_500);
  });

  it("ignores expenses and zero-amount rows, which are not a price", () => {
    const noise = [
      txn({ id: "out", payer: "Rosa", serviceId: "svc-1", amountCents: 9_000, direction: "out", date: "2026-08-01" }),
      txn({ id: "zero", payer: "Rosa", serviceId: "svc-1", amountCents: 0, date: "2026-08-02" }),
      ...rows,
    ];
    expect(rememberedFor(noise, "Rosa", "svc-1")?.amountCents).toBe(6_500);
  });

  it("lets a same-day correction become the new usual", () => {
    // Same-date ties break by array position, which is newest-first by
    // invariant: both save paths prepend and the database loads that way.
    const sameDay = [
      txn({ id: "correction", payer: "Rosa", serviceId: "svc-1", amountCents: 7_000, date: "2026-07-01" }),
      txn({ id: "original", payer: "Rosa", serviceId: "svc-1", amountCents: 6_500, date: "2026-07-01" }),
    ];
    expect(rememberedFor(sameDay, "Rosa", "svc-1")?.amountCents).toBe(7_000);
  });
});

describe("the payer autocomplete", () => {
  it("lists business income payers, most recent first, without repeating anyone", () => {
    const rows = [
      txn({ id: "a", payer: "Rosa" }),
      txn({ id: "b", payer: "Mike" }),
      txn({ id: "c", payer: "rosa" }),
    ];
    expect(knownPayers(rows)).toEqual(["Rosa", "Mike"]);
  });

  it("leaves out expenses, personal rows and nameless payments", () => {
    const rows = [
      txn({ id: "a", payer: "Home Depot", direction: "out" }),
      txn({ id: "b", payer: "Mum", business: false }),
      txn({ id: "c", payer: "   " }),
      txn({ id: "d", payer: "Rosa" }),
    ];
    expect(knownPayers(rows)).toEqual(["Rosa"]);
  });

  it("includes a payer nobody has sorted yet — spelling the name the same twice is the point", () => {
    expect(knownPayers([txn({ payer: "Rosa", business: null })])).toEqual(["Rosa"]);
  });

  it("stops at fifty names so the list stays a list", () => {
    const rows = Array.from({ length: 80 }, (_, i) => txn({ id: `t${i}`, payer: `Payer ${i}` }));
    expect(knownPayers(rows)).toHaveLength(50);
  });

  it("lists nobody from an empty ledger", () => {
    expect(knownPayers([])).toEqual([]);
  });
});

describe("who this sale is probably for", () => {
  const rosa = client({ id: "c1", name: "Rosa" });
  const mike = client({ id: "c2", name: "Mike" });
  const ana = client({ id: "c3", name: "Ana" });

  it("puts whoever most recently bought one of the picked products first", () => {
    const sales = [
      sale({ id: "s1", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-1" })] }),
      sale({ id: "s2", clientId: "c2", date: "2026-08-01", lineItems: [item({ serviceId: "svc-9" })] }),
    ];
    expect(rankClientsForProducts([rosa, mike], sales, ["svc-1"]).map((c) => c.id)).toEqual([
      "c1",
      "c2",
    ]);
  });

  it("falls back to whoever bought anything most recently", () => {
    const sales = [
      sale({ id: "s1", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-9" })] }),
      sale({ id: "s2", clientId: "c2", date: "2026-08-01", lineItems: [item({ serviceId: "svc-9" })] }),
    ];
    expect(rankClientsForProducts([rosa, mike], sales, ["svc-1"]).map((c) => c.id)).toEqual([
      "c2",
      "c1",
    ]);
  });

  it("never suggests a client the data cannot back", () => {
    const sales = [sale({ id: "s1", clientId: "c1", date: "2026-06-01" })];
    expect(rankClientsForProducts([rosa, ana], sales, []).map((c) => c.id)).toEqual(["c1"]);
  });

  it("breaks a dead-even tie by name, so the chips do not shuffle between renders", () => {
    const sales = [
      sale({ id: "s1", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-1" })] }),
      sale({ id: "s2", clientId: "c3", date: "2026-06-01", lineItems: [item({ serviceId: "svc-1" })] }),
    ];
    expect(rankClientsForProducts([rosa, ana], sales, ["svc-1"]).map((c) => c.name)).toEqual([
      "Ana",
      "Rosa",
    ]);
  });

  it("shows at most four chips by default", () => {
    const clients = Array.from({ length: 9 }, (_, i) => client({ id: `c${i}`, name: `C${i}` }));
    const sales = clients.map((c, i) =>
      sale({ id: `s${i}`, clientId: c.id, date: "2026-06-01" }),
    );
    expect(rankClientsForProducts(clients, sales, [])).toHaveLength(4);
    expect(rankClientsForProducts(clients, sales, [], 2)).toHaveLength(2);
  });

  it("suggests nobody when nothing has ever been sold", () => {
    expect(rankClientsForProducts([rosa, mike], [], ["svc-1"])).toEqual([]);
  });

  it("puts the more recent buyer of the picked product ahead of the older one", () => {
    const sales = [
      sale({ id: "s1", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-1" })] }),
      sale({ id: "s2", clientId: "c2", date: "2026-08-01", lineItems: [item({ serviceId: "svc-1" })] }),
    ];
    expect(rankClientsForProducts([rosa, mike], sales, ["svc-1"]).map((c) => c.id)).toEqual([
      "c2",
      "c1",
    ]);
  });

  it("ignores a sale with nobody attached when working out who bought what", () => {
    const sales = [
      sale({ id: "s1", clientId: null, date: "2026-08-01", lineItems: [item({ serviceId: "svc-1" })] }),
      sale({ id: "s2", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-1" })] }),
    ];
    expect(rankClientsForProducts([rosa, mike], sales, ["svc-1"]).map((c) => c.id)).toEqual(["c1"]);
  });

  it("keeps the most recent date when a client has several sales", () => {
    const sales = [
      sale({ id: "s1", clientId: "c1", date: "2026-08-01", lineItems: [item({ serviceId: "svc-9" })] }),
      sale({ id: "s2", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-9" })] }),
      sale({ id: "s3", clientId: "c2", date: "2026-07-01", lineItems: [item({ serviceId: "svc-9" })] }),
    ];
    expect(rankClientsForProducts([rosa, mike], sales, []).map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

describe("ranking the catalog when the client has bought the same thing twice", () => {
  it("puts the more often bought service first, then the more recent", () => {
    const catalog = [
      service({ id: "svc-1", name: "Lawn mowing" }),
      service({ id: "svc-2", name: "Deep clean" }),
    ];
    const sales = [
      sale({ id: "s1", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-2" })] }),
      sale({ id: "s2", clientId: "c1", date: "2026-07-01", lineItems: [item({ serviceId: "svc-2" })] }),
      sale({ id: "s3", clientId: "c1", date: "2026-08-01", lineItems: [item({ serviceId: "svc-1" })] }),
    ];
    expect(rankServicesForClient(catalog, sales, "c1").map((s) => s.id)).toEqual([
      "svc-2",
      "svc-1",
    ]);
  });

  it("breaks a dead-even tie by name so the picker does not reshuffle", () => {
    const catalog = [
      service({ id: "svc-1", name: "Zebra wash" }),
      service({ id: "svc-2", name: "Apple pick" }),
    ];
    const sales = [
      sale({
        id: "s1",
        clientId: "c1",
        date: "2026-06-01",
        lineItems: [item({ serviceId: "svc-1" }), item({ serviceId: "svc-2" })],
      }),
    ];
    expect(rankServicesForClient(catalog, sales, "c1").map((s) => s.name)).toEqual([
      "Apple pick",
      "Zebra wash",
    ]);
  });
});

describe("this client's usual services", () => {
  const sales = [
    sale({ id: "s1", clientId: "c1", date: "2026-06-01", lineItems: [item({ serviceId: "svc-1" })] }),
    sale({ id: "s2", clientId: "c1", date: "2026-07-01", lineItems: [item({ serviceId: "svc-1" })] }),
    sale({ id: "s3", clientId: "c1", date: "2026-08-01", lineItems: [item({ serviceId: "svc-2" })] }),
    sale({ id: "s4", clientId: "c2", date: "2026-08-01", lineItems: [item({ serviceId: "svc-3" })] }),
  ];
  const catalog = [
    service({ id: "svc-1", name: "Lawn mowing" }),
    service({ id: "svc-2", name: "Deep clean" }),
    service({ id: "svc-3", name: "Haircut" }),
  ];

  it("names what they have actually bought, and nobody else's purchases", () => {
    expect(usualServiceIds(sales, "c1")).toEqual(new Set(["svc-1", "svc-2"]));
    expect(usualServiceIds(sales, "c2")).toEqual(new Set(["svc-3"]));
    expect(usualServiceIds(sales, "nobody")).toEqual(new Set());
  });

  it("ranks the usual ones by how often, then how recently, and keeps the rest below", () => {
    expect(rankServicesForClient(catalog, sales, "c1").map((s) => s.id)).toEqual([
      "svc-1",
      "svc-2",
      "svc-3",
    ]);
  });

  it("is a ranking, never a filter — the whole catalog stays reachable", () => {
    fc.assert(
      fc.property(salesArb(), (anySales) => {
        const ranked = rankServicesForClient(catalog, anySales, "c1");
        expect(ranked).toHaveLength(catalog.length);
        expect(new Set(ranked.map((s) => s.id))).toEqual(
          new Set(catalog.map((s) => s.id)),
        );
      }),
      RUNS,
    );
  });

  it("leaves the catalog in its own order for a client with no history", () => {
    expect(rankServicesForClient(catalog, sales, "nobody").map((s) => s.id)).toEqual([
      "svc-1",
      "svc-2",
      "svc-3",
    ]);
  });

  it("ignores custom-amount lines, which have no service behind them", () => {
    const custom = [
      sale({ id: "s1", clientId: "c1", lineItems: [item({ serviceId: null })] }),
    ];
    expect(usualServiceIds(custom, "c1")).toEqual(new Set());
  });
});

describe("the computed mileage log", () => {
  const distances = new Map([
    ["c1", 125],
    ["c2", 0],
  ]);

  it("counts one round trip per logged visit to a client whose distance is on file", () => {
    const sales = [
      { clientId: "c1", date: "2026-07-01", state: "paid", recurringTemplateId: null },
      { clientId: "c1", date: "2026-07-08", state: "paid", recurringTemplateId: null },
    ];
    expect(mileageLog(distances, sales)).toEqual([
      { date: "2026-07-01", clientId: "c1", tenths: 125 },
      { date: "2026-07-08", clientId: "c1", tenths: 125 },
    ]);
    expect(totalTenths(mileageLog(distances, sales))).toBe(250);
    expect(formatMiles(250)).toBe("25.0");
  });

  it("never guesses a distance that was never typed", () => {
    const sales = [
      { clientId: "unknown", date: "2026-07-01", state: "paid", recurringTemplateId: null },
      { clientId: null, date: "2026-07-01", state: "paid", recurringTemplateId: null },
      { clientId: "c2", date: "2026-07-01", state: "paid", recurringTemplateId: null },
    ];
    expect(mileageLog(distances, sales)).toEqual([]);
  });

  it("refuses to back-fill phantom trips from open recurring instances", () => {
    // Three weeks of vacation must not put three drives the owner never
    // made into a document a tax preparer reads.
    const sales = [
      { clientId: "c1", date: "2026-07-01", state: "open", recurringTemplateId: "tpl-1" },
      { clientId: "c1", date: "2026-07-08", state: "open", recurringTemplateId: "tpl-1" },
    ];
    expect(mileageLog(distances, sales)).toEqual([]);
  });

  it("counts a recurring instance once the owner marks it paid — that is the evidence", () => {
    const sales = [
      { clientId: "c1", date: "2026-07-01", state: "paid", recurringTemplateId: "tpl-1" },
      { clientId: "c1", date: "2026-07-08", state: "expected", recurringTemplateId: "tpl-1" },
    ];
    expect(mileageLog(distances, sales)).toHaveLength(2);
  });

  it("counts a one-off open sale, which the owner logged by hand", () => {
    const sales = [
      { clientId: "c1", date: "2026-07-01", state: "open", recurringTemplateId: null },
    ];
    expect(mileageLog(distances, sales)).toHaveLength(1);
  });

  it("reads oldest first, the way a log should", () => {
    const sales = [
      { clientId: "c1", date: "2026-08-01", state: "paid", recurringTemplateId: null },
      { clientId: "c1", date: "2026-07-01", state: "paid", recurringTemplateId: null },
    ];
    expect(mileageLog(distances, sales).map((e) => e.date)).toEqual([
      "2026-07-01",
      "2026-08-01",
    ]);
  });

  it("logs nothing, and totals zero, when there is nothing to log", () => {
    expect(mileageLog(new Map(), [])).toEqual([]);
    expect(totalTenths([])).toBe(0);
    expect(formatMiles(0)).toBe("0.0");
  });
});
