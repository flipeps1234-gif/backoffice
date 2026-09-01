# Overnight engine test suite — summary

Branch: `overnight/engine-tests`. Nothing here touches `main`, and no file
under `src/lib` (or any other production source) was modified.

## The plan, written before the first test

`src/lib` is 39 modules and ~3,900 lines of pure TypeScript: the money
primitives (`transaction.ts`, `sale.ts`, `service.ts`), the engines that
decide things (`matching.ts`, `recurring.ts`, `dashboard.ts`,
`insights.ts`, `recommend.ts`), the derived views (`customer-memory.ts`,
`mileage.ts`, `setaside.ts`, `recap.ts`, `history.ts`, `search.ts`), the
exports (`csv.ts`), the ingest guards (`extract/validate.ts`,
`extract/dedupe.ts`), and a tail of small data/label modules
(`category.ts`, `client.ts`, `profile.ts`, `notify/types.ts`). The suite
attacks them in the order the brief sets: first the five INVARIANTS as
fast-check properties over generated ledgers (integer cents everywhere;
one payment claims at most one sale; the received/owed partition is
total and disjoint; every aggregate is permutation-independent; no
exported function mutates its arguments), then the two STATE MACHINES
that carry real money risk (recurring generation — miss counting, the
pause threshold at exactly 3, the monthly clamp across Feb 29 and
month-end; and the sale-state partition that keeps owed out of revenue),
then the MATCHING engine (exact-amount rule, fuzzy-name rule,
±10-day window, the recurring tie-break, greedy one-per-sale claiming,
and the ambiguity fallthrough to suggestions), and finally the EDGE
VALUES (0 and 1 cent, `MAX_CENTS`, negative and NaN rejection, month/year
boundaries, DST dates, and empty inputs returning zeros rather than
`undefined`/`NaN`). Anything I find that disagrees with the documented law
is written as a failing test, isolated with `test.fails(...)` so the suite
stays green, and recorded in BUGS.md rather than fixed.

## What I did

(filled in as the night goes — see the sections below)

## How to run it in the morning

```bash
git checkout overnight/engine-tests && npm install && npm run test:engine
```

Coverage, scoped to `src/lib`:

```bash
npm run test:engine -- --coverage
```
