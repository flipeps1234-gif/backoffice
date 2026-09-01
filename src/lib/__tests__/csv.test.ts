import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { everythingCsv, mileageCsv, taxCsv } from "../csv";
import { client, item, sale, service, transactionsArb, txn } from "./arbitraries";

/**
 * Two exports, on purpose.
 *
 * taxCsv is "give this to your tax preparer": business rows only, ACTUAL
 * logged amounts. The catalog's cost ESTIMATES never appear, because an
 * estimate on a tax document is a lie.
 *
 * everythingCsv is the user getting their own data out — every row
 * whatever it is, because the permanent boundary is "never gate viewing
 * or exporting a user's own data".
 */

const RUNS = { numRuns: 300 };

const lines = (csv: string): string[] =>
  csv.replace(/^﻿/, "").replace(/\r\n$/, "").split("\r\n");

describe("the file a spreadsheet can actually open", () => {
  it("starts with the byte-order mark that makes Excel decode UTF-8", () => {
    // Without it, "José" opens as "JosÃ©" on the accountant's machine.
    expect(taxCsv([], [])).toMatch(/^﻿/);
    expect(everythingCsv([], [])).toMatch(/^﻿/);
    expect(mileageCsv([], [])).toMatch(/^﻿/);
  });

  it("separates rows with CRLF and ends with one", () => {
    const csv = taxCsv([txn({ business: true })], []);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it("writes a header even when there is nothing to export", () => {
    expect(lines(taxCsv([], []))).toEqual([
      "date,type,who,service,note,category,amount",
    ]);
  });
});

describe("text that came off a screenshot cannot execute in a spreadsheet", () => {
  const cell = (payer: string): string =>
    lines(taxCsv([txn({ business: true, payer })], []))[1].split(",")[2];

  it("neutralizes a leading equals, plus, minus or at sign with an apostrophe", () => {
    // Anyone who pays the owner controls the payer field, and Excel runs a
    // cell starting with these as a formula even when it is quoted.
    expect(cell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(cell("+1")).toBe("'+1");
    expect(cell("@import")).toBe("'@import");
    expect(cell("-cmd")).toBe("'-cmd");
  });

  it("quotes a value containing a comma, a quote or a newline", () => {
    expect(cell('Rosa "Rose" Delgado')).toBe('"Rosa ""Rose"" Delgado"');
    const commaRow = lines(taxCsv([txn({ business: true, payer: "Delgado, Rosa" })], []))[1];
    expect(commaRow).toContain('"Delgado, Rosa"');
    // The newline case, asserted and not just named: unquoted, a payer
    // with a line break would split the record and shift every column
    // after it. Quoted, the file still parses as one header + one row
    // (rows are separated by CRLF; a bare \n or \r stays inside the
    // quotes and never makes a new record).
    const newlineCsv = taxCsv([txn({ business: true, payer: "Rosa\nDelgado" })], []);
    expect(newlineCsv).toContain('"Rosa\nDelgado"');
    expect(lines(newlineCsv)).toHaveLength(2);
    const crCsv = taxCsv([txn({ business: true, memo: "line one\rline two" })], []);
    expect(crCsv).toContain('"line one\rline two"');
    expect(lines(crCsv)).toHaveLength(2);
  });

  it("never lets a payer or memo break the row count, whatever it contains", () => {
    // fc.string()'s default unit never emits \n or \r, so a plain string
    // generator cannot exercise the one case this law exists for. This
    // unit forces the dangerous characters in, and the assertion strips
    // quoted fields FIRST — outside the quotes, the only line breaks left
    // must be the two CRLF row separators (header row, data row).
    const hostile = fc.string({
      unit: fc.constantFrom("a", "é", " ", '"', ",", "\n", "\r", "=", "'"),
    });
    fc.assert(
      fc.property(hostile, hostile, (payer, memo) => {
        const csv = taxCsv([txn({ business: true, payer, memo })], []).replace(/^﻿/, "");
        const structure = csv.replace(/"(?:[^"]|"")*"/g, "");
        expect(structure.match(/\r\n/g)).toHaveLength(2);
        expect(structure.replace(/\r\n/g, "")).not.toMatch(/[\n\r]/);
      }),
      RUNS,
    );
  });
});

describe("the tax export is business actuals and nothing else", () => {
  it("exports business rows and leaves personal and unsorted ones out", () => {
    const rows = [
      txn({ id: "a", business: true, payer: "Rosa", amountCents: 6_000 }),
      txn({ id: "b", business: false, payer: "Netflix", amountCents: 1_599 }),
      txn({ id: "c", business: null, payer: "Unknown", amountCents: 4_200 }),
    ];
    const body = lines(taxCsv(rows, [])).slice(1);
    expect(body).toHaveLength(1);
    expect(body[0]).toContain("Rosa");
  });

  it("writes expenses as negative so the amount column sums to the real number", () => {
    const rows = [
      txn({ id: "a", business: true, amountCents: 10_000, direction: "in" }),
      txn({ id: "b", business: true, amountCents: 2_500, direction: "out" }),
    ];
    const amounts = lines(taxCsv(rows, [])).slice(1).map((l) => l.split(",").at(-1));
    expect(amounts).toEqual(["100.00", "-25.00"]);
  });

  it("writes money as plain decimal dollars with no symbol or grouping", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99_999_999 }), (cents) => {
        const row = lines(taxCsv([txn({ business: true, amountCents: cents })], []))[1];
        expect(row.split(",").at(-1)).toBe((cents / 100).toFixed(2));
      }),
      RUNS,
    );
  });

  it("sorts oldest first, the way an accountant reads", () => {
    const rows = [
      txn({ id: "a", business: true, date: "2026-07-19" }),
      txn({ id: "b", business: true, date: "2026-07-04" }),
    ];
    const dates = lines(taxCsv(rows, [])).slice(1).map((l) => l.split(",")[0]);
    expect(dates).toEqual(["2026-07-04", "2026-07-19"]);
  });

  it("puts undated rows last and says 'unknown' rather than leaving a blank", () => {
    const rows = [
      txn({ id: "a", business: true, date: "" }),
      txn({ id: "b", business: true, date: "2026-07-04" }),
    ];
    const dates = lines(taxCsv(rows, [])).slice(1).map((l) => l.split(",")[0]);
    expect(dates).toEqual(["2026-07-04", "unknown"]);
  });

  it("labels an expense with the Schedule C line the owner tagged, in English", () => {
    const row = lines(
      taxCsv([txn({ business: true, direction: "out", category: "supplies" })], []),
    )[1];
    expect(row).toContain("Supplies (line 22)");
  });

  it("leaves the category blank on income, where it would mean nothing", () => {
    const row = lines(
      taxCsv([txn({ business: true, direction: "in", category: "supplies" })], []),
    )[1];
    expect(row).not.toContain("Supplies");
  });

  it("never guesses a tax line for a category it does not recognize", () => {
    const row = lines(
      taxCsv([txn({ business: true, direction: "out", category: "made-up" })], []),
    )[1];
    expect(row.split(",")[5]).toBe("");
  });

  it("names the service a payment was stamped with, and stays blank when it was not", () => {
    const svc = service({ id: "svc-1", name: "Lawn mowing" });
    const stamped = lines(taxCsv([txn({ business: true, serviceId: "svc-1" })], [svc]))[1];
    const bare = lines(taxCsv([txn({ business: true, serviceId: null })], [svc]))[1];
    expect(stamped.split(",")[3]).toBe("Lawn mowing");
    expect(bare.split(",")[3]).toBe("");
  });

  it("puts the business on top when the owner filled the profile in", () => {
    const csv = lines(
      taxCsv([], [], { businessName: "Rosa Cleans", ownerName: "Rosa", usState: "FL" }),
    );
    expect(csv.slice(0, 4)).toEqual([
      "business,Rosa Cleans",
      "owner,Rosa",
      "state,FL",
      "",
    ]);
  });

  it("emits a file byte-identical to the pre-profile format when the profile is blank", () => {
    const blank = { businessName: "", ownerName: "", usState: "" };
    expect(taxCsv([], [], blank)).toBe(taxCsv([], []));
  });
});

describe("the everything export is the user's own copy, with nothing filtered out", () => {
  const rows = [
    txn({ id: "a", business: true, payer: "Rosa", amountCents: 6_000 }),
    txn({ id: "b", business: false, payer: "Netflix", amountCents: 1_599 }),
    txn({ id: "c", business: null, payer: "Unknown", amountCents: 4_200 }),
  ];

  it("includes personal and unsorted rows, each labelled so it cannot be mistaken for income", () => {
    const body = lines(everythingCsv(rows, [])).slice(2);
    expect(body).toHaveLength(3);
    expect(body.map((l) => l.split(",")[1])).toEqual([
      "business",
      "personal",
      "unsorted",
    ]);
  });

  it("carries the sales book, including open sales that have no payment row at all", () => {
    const csv = everythingCsv([], [], [
      sale({ id: "s1", clientId: "c1", state: "open", lineItems: [item({ unitCents: 12_000 })] }),
    ], [client({ id: "c1", name: "Rosa" })]);
    expect(csv).toContain("sales");
    expect(csv).toContain("open");
    expect(csv).toContain("120.00");
    expect(csv).toContain("Rosa");
  });

  it("carries the client directory and the recurring templates", () => {
    const csv = everythingCsv(
      [],
      [],
      [],
      [client({ id: "c1", name: "Rosa", distanceTenths: 125 })],
      [
        {
          id: "tpl-1",
          clientId: "c1",
          lineItems: [item({ unitCents: 6_000 })],
          cadence: { type: "weekly" },
          nextDue: "2026-08-20",
          active: true,
          consecutiveMisses: 0,
          endedOn: null,
        },
      ],
    );
    expect(csv).toContain("clients");
    expect(csv).toContain("12.5");
    expect(csv).toContain("recurring");
    expect(csv).toContain("Every week");
    expect(csv).toContain("2026-08-20");
    expect(csv).toContain("active");
  });

  it("tells the truth about a template that was ended rather than merely paused", () => {
    const template = {
      id: "tpl-1",
      clientId: "c1",
      lineItems: [item()],
      cadence: { type: "weekly" as const },
      nextDue: "2026-08-20",
      active: true,
      consecutiveMisses: 0,
      endedOn: "2026-06-30",
    };
    expect(everythingCsv([], [], [], [], [template])).toContain("ended");
    expect(
      everythingCsv([], [], [], [], [{ ...template, endedOn: null, active: false }]),
    ).toContain("paused");
  });

  it("says a sale has a photo even when the bytes were never loaded into the app", () => {
    const withPhoto = sale({ id: "s1", clientId: null, photo: null });
    const csv = everythingCsv([], [], [withPhoto], [], [], new Set(["s1"]));
    const salesSection = lines(csv).slice(lines(csv).indexOf("sales") + 2);
    expect(salesSection[0].endsWith(",yes")).toBe(true);
  });

  it("keeps the consent timestamps, which are the user's own proof of opt-in", () => {
    const csv = everythingCsv([], [], [], [], [], undefined, null, {
      channel: "off",
      phone: "",
      whatsappConsentAt: "2026-08-01T10:00:00Z",
      smsConsentAt: null,
      optedOutAt: "2026-08-09T12:00:00Z",
    });
    expect(csv).toContain("notifications");
    expect(csv).toContain("2026-08-01T10:00:00Z");
    expect(csv).toContain("2026-08-09T12:00:00Z");
  });

  it("omits a section entirely when there is nothing in it", () => {
    const csv = everythingCsv([], []);
    expect(csv).not.toContain("sales");
    expect(csv).not.toContain("clients");
    expect(csv).not.toContain("recurring");
    expect(csv).not.toContain("notifications");
  });

  it("exports every single row it was given, for any ledger", () => {
    fc.assert(
      fc.property(transactionsArb(), (ledger) => {
        const body = lines(everythingCsv(ledger, [])).slice(2);
        expect(body.filter((l) => l !== "")).toHaveLength(ledger.length);
      }),
      RUNS,
    );
  });
});

describe("the mileage log says it is an estimate by showing its arithmetic", () => {
  it("prints one row per visit and a total that adds them up", () => {
    const entries = [
      { date: "2026-07-01", clientId: "c1", tenths: 125 },
      { date: "2026-07-08", clientId: "c1", tenths: 125 },
    ];
    const rows = lines(mileageCsv(entries, [client({ id: "c1", name: "Rosa" })]));
    expect(rows[0]).toBe("date,client,round_trip_miles");
    expect(rows[1]).toBe("2026-07-01,Rosa,12.5");
    expect(rows.at(-1)).toBe("total,,25.0");
  });

  it("totals zero for an empty log rather than printing nothing", () => {
    expect(lines(mileageCsv([], [])).at(-1)).toBe("total,,0.0");
  });

  it("leaves the name blank for a client who is no longer in the directory", () => {
    const rows = lines(mileageCsv([{ date: "2026-07-01", clientId: "gone", tenths: 10 }], []));
    expect(rows[1]).toBe("2026-07-01,,1.0");
  });
});
