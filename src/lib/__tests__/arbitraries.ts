import fc from "fast-check";

import type { Client } from "../client";
import type { LineItem, Sale, SaleState } from "../sale";
import type { Service } from "../service";
import { MAX_CENTS, type Transaction } from "../transaction";

/**
 * Generators for the engine suite. Not a *.test.ts file on purpose — the
 * runner only collects those, so this stays a plain module.
 *
 * The shapes here are the shapes the app really produces: money is always
 * a whole number of cents inside 0..MAX_CENTS (the DB's check constraint),
 * dates are either a real YYYY-MM-DD or the empty string the extractor
 * writes when it cannot read one, and `business` is genuinely tri-state
 * because an unsorted row is a state the ledger lives in.
 */

export const centsArb = fc.integer({ min: 0, max: MAX_CENTS });

/** Small amounts, where rounding and off-by-one bugs actually live. */
export const smallCentsArb = fc.integer({ min: 0, max: 500_00 });

/** A real calendar date in a range the product plausibly sees. */
export const isoDateArb = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-12-31T00:00:00Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));

/** The extractor's "I could not read a date" is the empty string. */
export const maybeIsoDateArb = fc.oneof(
  { weight: 9, arbitrary: isoDateArb },
  { weight: 1, arbitrary: fc.constant("") },
);

export const nameArb = fc.constantFrom(
  "Rosa Delgado",
  "Sarah Johnson",
  "José Márquez",
  "Mike",
  "Anna-Maria O'Neill",
  "chen wei",
  "",
);

export const idArb = fc.uuid();

export const transactionArb = (
  overrides: Partial<Record<keyof Transaction, fc.Arbitrary<unknown>>> = {},
): fc.Arbitrary<Transaction> =>
  fc.record({
    id: idArb,
    payer: nameArb,
    amountCents: smallCentsArb,
    date: maybeIsoDateArb,
    memo: fc.constantFrom("", "cleaning", "Zelle payment", "for the yard"),
    source: fc.constantFrom("screenshot", "manual"),
    direction: fc.constantFrom("in", "out"),
    serviceId: fc.option(idArb, { nil: null }),
    quantity: fc.option(fc.double({ min: 0.5, max: 100, noNaN: true }), {
      nil: null,
    }),
    business: fc.constantFrom(true, false, null),
    matchedSaleId: fc.option(idArb, { nil: null }),
    category: fc.option(fc.constantFrom("supplies", "car", "meals"), {
      nil: null,
    }),
    confidence: fc.record({
      payer: fc.double({ min: 0, max: 1, noNaN: true }),
      amountCents: fc.double({ min: 0, max: 1, noNaN: true }),
      date: fc.double({ min: 0, max: 1, noNaN: true }),
    }),
    ...overrides,
  }) as fc.Arbitrary<Transaction>;

export const transactionsArb = (maxLength = 12) =>
  fc.array(transactionArb(), { maxLength });

/** Income only, and sorted into the business — what the dashboard reads. */
export const businessIncomeArb = (maxLength = 12) =>
  fc.array(
    transactionArb({
      direction: fc.constant("in"),
      business: fc.constant(true),
    }),
    { maxLength },
  );

export const lineItemArb: fc.Arbitrary<LineItem> = fc.record({
  serviceId: fc.option(idArb, { nil: null }),
  name: fc.constantFrom("Lawn mowing", "Deep clean", "Haircut", ""),
  // Fractional quantities are legal for rate services (2.5 hours).
  quantity: fc.oneof(
    fc.integer({ min: 1, max: 20 }),
    fc.double({ min: 0.5, max: 40, noNaN: true }),
  ),
  unitCents: smallCentsArb,
  unitCostCents: fc.option(smallCentsArb, { nil: null }),
});

export const saleStateArb: fc.Arbitrary<SaleState> = fc.constantFrom(
  "open",
  "expected",
  "paid",
);

export const saleArb = (
  overrides: Partial<Record<keyof Sale, fc.Arbitrary<unknown>>> = {},
): fc.Arbitrary<Sale> =>
  fc.record({
    id: idArb,
    clientId: fc.option(idArb, { nil: null }),
    lineItems: fc.array(lineItemArb, { minLength: 1, maxLength: 4 }),
    date: isoDateArb,
    state: saleStateArb,
    method: fc.option(fc.constantFrom("cash", "digital"), { nil: null }),
    matchedTxnId: fc.option(idArb, { nil: null }),
    recurringTemplateId: fc.option(idArb, { nil: null }),
    notes: fc.constantFrom("", "left gate open"),
    photo: fc.constant(null),
    ...overrides,
  }) as fc.Arbitrary<Sale>;

export const salesArb = (maxLength = 10) => fc.array(saleArb(), { maxLength });

export const clientArb: fc.Arbitrary<Client> = fc.record({
  id: idArb,
  name: nameArb,
  notes: fc.constantFrom("", "back door"),
  distanceTenths: fc.option(fc.integer({ min: 1, max: 999 }), { nil: null }),
});

export const serviceArb: fc.Arbitrary<Service> = fc.record({
  id: idArb,
  name: fc.constantFrom("Lawn mowing", "Deep clean", "Haircut"),
  pricing: fc.oneof(
    fc.record({ type: fc.constant("flat" as const), cents: smallCentsArb }),
    fc.record({
      type: fc.constant("rate" as const),
      cents: fc.integer({ min: 1, max: 10_000 }),
      unit: fc.constantFrom("sqft" as const, "hour" as const, "room" as const),
    }),
  ),
  costCents: fc.option(smallCentsArb, { nil: null }),
});

// ---- plain fixtures, for the example-based tests ----

export const txn = (over: Partial<Transaction> = {}): Transaction => ({
  id: "tx-1",
  payer: "Rosa Delgado",
  amountCents: 6_000,
  date: "2026-07-01",
  memo: "",
  source: "screenshot",
  direction: "in",
  serviceId: null,
  quantity: null,
  business: null,
  matchedSaleId: null,
  category: null,
  confidence: {},
  ...over,
});

export const item = (over: Partial<LineItem> = {}): LineItem => ({
  serviceId: null,
  name: "Lawn mowing",
  quantity: 1,
  unitCents: 6_000,
  unitCostCents: null,
  ...over,
});

export const sale = (over: Partial<Sale> = {}): Sale => ({
  id: "sale-1",
  clientId: "client-1",
  lineItems: [item()],
  date: "2026-07-01",
  state: "open",
  method: null,
  matchedTxnId: null,
  recurringTemplateId: null,
  notes: "",
  photo: null,
  ...over,
});

export const client = (over: Partial<Client> = {}): Client => ({
  id: "client-1",
  name: "Rosa Delgado",
  notes: "",
  distanceTenths: null,
  ...over,
});

export const service = (over: Partial<Service> = {}): Service => ({
  id: "svc-1",
  name: "Lawn mowing",
  pricing: { type: "flat", cents: 6_000 },
  costCents: null,
  ...over,
});

/** Deep structural clone, for the "did you mutate my input?" checks. */
export const snapshot = <T>(value: T): string => JSON.stringify(value);

/** Every permutation-independence test uses the same shuffle. */
export const permutations = <T>(items: T[]): fc.Arbitrary<T[]> =>
  fc.shuffledSubarray(items, { minLength: items.length });
