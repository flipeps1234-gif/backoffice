import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { everythingCsv, mileageCsv, taxCsv } from "../csv";
import { byMonth, marginByService, revenueByService } from "../dashboard";
import { rememberedFor, knownPayers } from "../customer-memory";
import { dedupe } from "../extract/dedupe";
import { validateExtraction } from "../extract/validate";
import { groupByDay } from "../history";
import { buildInsights } from "../insights";
import { matchBatch, txnCandidatesForSale } from "../matching";
import { mileageLog, totalTenths } from "../mileage";
import { dueRecap } from "../recap";
import {
  rankClientsForProducts,
  rankServicesForClient,
  usualServiceIds,
} from "../recommend";
import { advance, fastForwardPastGap, generateDue } from "../recurring";
import {
  owedCents,
  receivedCents,
  saleMarginCents,
  saleProvenance,
  saleTotalCents,
  validateLineItems,
} from "../sale";
import { searchAll } from "../search";
import { quarterIncomeCents } from "../setaside";
import { totalCents, totalsByDirection } from "../transaction";
import {
  clientArb,
  salesArb,
  serviceArb,
  snapshot,
  transactionsArb,
  sale,
  client,
  service,
  txn,
  item,
} from "./arbitraries";

/**
 * LAW 5 — nothing in the engine mutates its inputs.
 *
 * The app hands these functions the very arrays it renders from. A sort in
 * place, a push into a caller's list, a field written onto a row — any of
 * those and the screen silently disagrees with the database. This file
 * takes a structural snapshot before each call and demands it back after.
 */

const RUNS = { numRuns: 300 };

/** Calls `run`, then fails if any argument changed shape or content. */
const leavesInputsAlone = (inputs: unknown[], run: () => unknown): void => {
  const before = inputs.map(snapshot);
  run();
  inputs.forEach((input, index) => {
    expect(snapshot(input)).toBe(before[index]);
  });
};

describe("the money primitives leave their arguments alone", () => {
  it("totalling a ledger does not touch the ledger", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) => {
        leavesInputsAlone([rows], () => {
          totalCents(rows);
          totalsByDirection(rows);
        });
      }),
      RUNS,
    );
  });

  it("summing sales does not touch the sales", () => {
    fc.assert(
      fc.property(salesArb(), (sales) => {
        leavesInputsAlone([sales], () => {
          receivedCents(sales);
          owedCents(sales);
          sales.forEach((s) => {
            saleTotalCents(s);
            saleMarginCents(s);
            saleProvenance(s);
          });
        });
      }),
      RUNS,
    );
  });

  it("validating line items builds new ones rather than editing what it was given", () => {
    const raw = [
      { serviceId: "a", name: " Lawn ", quantity: 2, unitCents: 100, unitCostCents: 10 },
      { name: "junk", quantity: 0, unitCents: 100 },
    ];
    leavesInputsAlone([raw], () => validateLineItems(raw));
    const out = validateLineItems(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).not.toBe(raw[0]);
  });
});

describe("the aggregating views leave their arguments alone", () => {
  it("the dashboard reads the ledger without rewriting it", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        fc.array(serviceArb, { maxLength: 4 }),
        (rows, services) => {
          leavesInputsAlone([rows, services], () => {
            byMonth(rows);
            revenueByService(rows, services);
            marginByService(rows, services);
          });
        },
      ),
      RUNS,
    );
  });

  it("insights, history, recap and the quarter figure all read only", () => {
    fc.assert(
      fc.property(transactionsArb(), (rows) => {
        leavesInputsAlone([rows], () => {
          buildInsights(rows);
          groupByDay(rows, "2026-08-14");
          dueRecap(rows, "2026-08-14", null);
          quarterIncomeCents(rows, "2026-08-14");
          knownPayers(rows);
          rememberedFor(rows, "Rosa Delgado", "svc-1");
        });
      }),
      RUNS,
    );
  });

  it("search sorts copies, never the caller's lists", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        salesArb(),
        fc.array(clientArb, { maxLength: 4 }),
        (transactions, sales, clients) => {
          leavesInputsAlone([transactions, sales, clients], () =>
            searchAll("rosa 120", { transactions, sales, clients }),
          );
        },
      ),
      RUNS,
    );
  });

  it("the mileage log neither reorders the sales nor edits the distance map", () => {
    fc.assert(
      fc.property(salesArb(), (sales) => {
        const distances = new Map(
          sales.filter((s) => s.clientId).map((s) => [s.clientId as string, 55]),
        );
        const mapBefore = snapshot([...distances.entries()]);
        leavesInputsAlone([sales], () => totalTenths(mileageLog(distances, sales)));
        expect(snapshot([...distances.entries()])).toBe(mapBefore);
      }),
      RUNS,
    );
  });
});

describe("the engines leave their arguments alone", () => {
  it("matching a batch does not write the link onto the rows it was given", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        salesArb(),
        fc.array(clientArb, { maxLength: 4 }),
        (batch, sales, clients) => {
          leavesInputsAlone([batch, sales, clients], () =>
            matchBatch(batch, sales, clients),
          );
        },
      ),
      RUNS,
    );
  });

  it("asking which payments could settle a sale does not change any of them", () => {
    fc.assert(
      fc.property(transactionsArb(), salesArb(1), (transactions, sales) => {
        const target = sales[0] ?? sale();
        leavesInputsAlone([transactions, target], () =>
          txnCandidatesForSale(transactions, target, "Rosa Delgado"),
        );
      }),
      RUNS,
    );
  });

  it("generating recurring instances returns a NEW template instead of advancing the old one", () => {
    const template = {
      id: "tpl-1",
      clientId: "client-1",
      lineItems: [item()],
      cadence: { type: "weekly" as const },
      nextDue: "2026-07-01",
      active: true,
      consecutiveMisses: 0,
      endedOn: null,
    };
    const existing = [sale({ id: "s1", date: "2026-07-01", recurringTemplateId: "tpl-1" })];
    const before = snapshot(template);
    const result = generateDue(template, existing, "2026-07-22", () => "new-id");
    expect(snapshot(template)).toBe(before);
    expect(result.template).not.toBe(template);
    expect(result.template.nextDue).not.toBe(template.nextDue);
  });

  it("an instance's line items are snapshots, so editing the template later cannot rewrite history", () => {
    const line = item({ unitCents: 5_000 });
    const template = {
      id: "tpl-1",
      clientId: "client-1",
      lineItems: [line],
      cadence: { type: "weekly" as const },
      nextDue: "2026-07-01",
      active: true,
      consecutiveMisses: 0,
      endedOn: null,
    };
    const { created } = generateDue(template, [], "2026-07-01", () => "new-id");
    expect(created).toHaveLength(1);
    expect(created[0].lineItems[0]).not.toBe(line);
    expect(created[0].lineItems[0]).toEqual(line);
  });

  it("fast-forwarding past a paused gap does not touch the template", () => {
    const template = {
      id: "tpl-1",
      clientId: "client-1",
      lineItems: [item()],
      cadence: { type: "monthly" as const },
      nextDue: "2026-01-31",
      active: false,
      consecutiveMisses: 3,
      endedOn: null,
    };
    leavesInputsAlone([template], () => fastForwardPastGap(template, "2026-08-14"));
  });

  it("advancing a due date returns a new string and never edits the cadence", () => {
    const cadence = { type: "everyN" as const, days: 10 };
    leavesInputsAlone([cadence], () => advance("2026-07-01", cadence));
  });
});

describe("the ingest guards leave their arguments alone", () => {
  it("deduping picks winners out of the batch without editing any of them", () => {
    fc.assert(
      fc.property(transactionsArb(), (batch) => {
        leavesInputsAlone([batch], () => dedupe(batch));
      }),
      RUNS,
    );
  });

  it("validating a model response builds fresh rows", () => {
    const raw = {
      transactions: [{ payer: " Rosa ", amountCents: 6000, date: "2026-07-01" }],
      warnings: [{ code: "unreadable", filename: "a.png" }],
    };
    leavesInputsAlone([raw], () => validateExtraction(raw));
  });
});

describe("the exports and the rankings leave their arguments alone", () => {
  it("writing a CSV does not reorder the caller's rows", () => {
    fc.assert(
      fc.property(
        transactionsArb(),
        salesArb(),
        fc.array(clientArb, { maxLength: 3 }),
        fc.array(serviceArb, { maxLength: 3 }),
        (transactions, sales, clients, services) => {
          leavesInputsAlone([transactions, sales, clients, services], () => {
            taxCsv(transactions, services);
            everythingCsv(transactions, services, sales, clients, []);
          });
        },
      ),
      RUNS,
    );
  });

  it("the mileage CSV does not reorder the entries it prints", () => {
    const entries = [
      { date: "2026-07-02", clientId: "c1", tenths: 55 },
      { date: "2026-07-01", clientId: "c1", tenths: 55 },
    ];
    leavesInputsAlone([entries], () => mileageCsv(entries, [client({ id: "c1" })]));
  });

  it("ranking clients and services returns new lists rather than sorting the catalog", () => {
    fc.assert(
      fc.property(
        fc.array(clientArb, { maxLength: 5 }),
        salesArb(),
        fc.array(serviceArb, { maxLength: 5 }),
        (clients, sales, services) => {
          leavesInputsAlone([clients, sales, services], () => {
            rankClientsForProducts(clients, sales, ["svc-1"]);
            rankServicesForClient(services, sales, "client-1");
            usualServiceIds(sales, "client-1");
          });
        },
      ),
      RUNS,
    );
  });

  it("ranking the catalog for a client returns every service exactly once", () => {
    const services = [service({ id: "a" }), service({ id: "b" }), service({ id: "c" })];
    const sales = [
      sale({ id: "s1", clientId: "c1", lineItems: [item({ serviceId: "b" })] }),
    ];
    const ranked = rankServicesForClient(services, sales, "c1");
    expect(ranked).toHaveLength(3);
    expect(new Set(ranked.map((s) => s.id))).toEqual(new Set(["a", "b", "c"]));
    expect(ranked[0].id).toBe("b");
  });
});

describe("a transaction handed to the matcher comes back untouched", () => {
  it("does not stamp matchedSaleId onto the caller's row", () => {
    const payment = txn({ id: "t1", amountCents: 6_000, payer: "Rosa Delgado" });
    const openSale = sale({ id: "s1", clientId: "c1", state: "open" });
    const result = matchBatch([payment], [openSale], [client({ id: "c1" })]);
    expect(result.links).toEqual([{ saleId: "s1", txnId: "t1" }]);
    expect(payment.matchedSaleId).toBeNull();
    expect(openSale.state).toBe("open");
  });
});
