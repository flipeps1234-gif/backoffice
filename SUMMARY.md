# Overnight engine test suite — summary

Branch: `overnight/engine-tests`, cut from `main` at `7fb9a29`. `main` was
never checked out for writing, never committed to, and never pushed. No
file under `src/lib` — or any other production source — was modified.

**Result: 455 tests, all green (453 passing + 2 marked `it.fails`), 99.01%
statement coverage of `src/lib`, and no money-wrong defect found.**

## Run it

```bash
git checkout overnight/engine-tests && npm install && npm run test:engine
```

With coverage:

```bash
npm run test:engine -- --coverage
```

`npm test` runs the same suite (the config's `include` already scopes to
`src/lib/__tests__`); `test:engine` names the directory explicitly so it
stays scoped if other suites are added later. Whole run: about 5 seconds.

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
one payment claims at most one sale; the received/owed partition is total
and disjoint; every aggregate is permutation-independent; no exported
function mutates its arguments), then the two STATE MACHINES that carry
real money risk (recurring generation and the sale-state partition), then
the MATCHING engine, and finally the EDGE VALUES (0 and 1 cent,
`MAX_CENTS`, negative and NaN rejection, month/year boundaries, DST dates,
and empty inputs returning zeros rather than `undefined`/`NaN`).

That plan survived contact. The only structural change: the sale-state
*transition table* turned out not to live in `src/lib` at all (see
Ambiguities, #1).

## What I did

Vitest 4 + fast-check 4 + `@vitest/coverage-v8`, all as devDependencies —
no runner existed before this. `vitest.config.mts` mirrors tsconfig's
`@/*` alias so the lib's own internal imports resolve, runs in plain Node
(no DOM), and scopes coverage to `src/lib`.

17 files in `src/lib/__tests__/`, one shared `arbitraries.ts` of
generators and fixtures, every test named in plain English after the law
it enforces:

| File | What it holds down |
| --- | --- |
| `money.test.ts` | Integer cents through every door; the comma-decimal parser in all four notations; the display round trip; the clamps |
| `ordering.test.ts` | Every total, month, insight and day group identical under permutation |
| `purity.test.ts` | A structural snapshot of every argument before and after each exported function |
| `matching.test.ts` | One payment ↔ one sale as a property; amount, name, date-window, tie-break and ambiguity rules as examples |
| `recurring.test.ts` | The miss counter at two/three/four; monthly clamping across Feb 29; both DST switches; the 120-step ceiling; resume fast-forward |
| `sale-state.test.ts` | The received/owed partition; the state table as documentation; the line-item validator against `fc.anything()` |
| `dashboard.test.ts` | Business rows only; revenue by service; the margin rule that excludes an unestimable job from both sides |
| `insights.test.ts` | The three facts, their tie-breaks, and all four "we can't tell you" cases |
| `csv.test.ts` | The BOM, CRLF, RFC-4180 quoting, and formula neutralization — checked against `fc.string()` in both text columns |
| `extract.test.ts` | `validateExtraction` against `fc.anything()`; real-calendar date rejection; dedupe's date-beats-confidence rule |
| `dates.test.ts` | Month/year/leap boundaries, both DST switches, the Apr-15 window, quarter edges |
| `search.test.ts` | Accent folding, AND tokens, money in all four notations |
| `derived-views.test.ts` | Customer memory, payer autocomplete, both ranking orders, phantom-trip exclusion |
| `catalog-and-labels.test.ts` | Catalog lookups, Schedule C labels, confidence flags, the consent record |
| `content-modules.test.ts` | The 714-key dictionary in three languages, the markdown reader, the site metadata |
| `device-storage.test.ts` | Locale/terms/settings against a fake `window`, including the private-browsing path where storage throws |
| `providers-and-notify.test.ts` | The provider seam, the offline mock extractor, the frequency cap, the parked invoice prototype |

Committed in four batches so a crash would have cost minutes.

## What I found

Four discrepancies, none of them money-wrong. Full write-ups in
[BUGS.md](BUGS.md); the short version:

1. **`parseMilesToTenths` stores `0` for any distance under 0.05 miles**
   instead of rejecting it — the rounding happens after the `<= 0` guard.
   The owner sees "0.0" saved on a client and no mileage rows ever appear.
   *state-wrong*, isolated with `it.fails`.
2. **`revenueByService` ranks equal earners by arrival order** — no final
   tie-break, unlike every other ranking in the codebase. *cosmetic*,
   isolated with `it.fails`.
3. **The parked `invoice.ts` prototype cannot read comma decimals**, so
   `1.234,56` becomes $1.23 where the ledger reads $1,234.56. *state-wrong*
   but confined to a module marked do-not-extend; pinned by a passing test.
4. **The same prototype rounds the quantity rather than the product**, so
   2.5 hours at $10 bills as $30 where the ledger says $25. Same caveat.

Plus one stale comment (`transaction.ts:68` gives a worked example the
clamp makes unreachable), pinned by a passing test.

Everything else held: integer cents through every operation and every
generated string, the one-payment-one-sale invariant under every
permutation, the received/owed partition, order independence, purity
across the whole module surface, and the recurring pause landing at
exactly three misses.

## What I skipped, and why

- **`src/app`, API routes and Supabase** — explicitly out of scope.
- **`extract/openai.ts`, `compress-image.ts`, `notify/sms.ts`,
  `notify/whatsapp.ts`, `supabase/*`** — network or browser only; stubbing
  them would test the stub. Excluded from the coverage denominator with a
  line-by-line justification in [COVERAGE.md](COVERAGE.md).
- **Fixing anything.** Rule 2 of the brief. Every finding is a test plus a
  BUGS.md entry.

## Ambiguities, and the interpretation I chose

1. **"EXPECTED state lifecycle: every legal transition and every illegal
   transition is rejected."** `src/lib` has no transition function — it
   holds what each state *means*, and the transitions are applied by the
   app layer as a conditional UPDATE in `src/app/upload-screen.tsx`, which
   the brief scoped out. **Chosen:** write the transition table out in
   `sale-state.test.ts` as documentation, prove that every state keeps the
   received/owed partition intact (including states no legal transition
   should produce), and record the enforcement gap here and in
   COVERAGE.md rather than reaching into `src/app` to close it.
2. **"Paid/unpaid branching at checkout produces correct ledger entries."**
   Same boundary: the branching lives in the checkout component. What
   `src/lib` owns is the resulting arithmetic, which is tested.
3. **Negative amounts: "rejection or documented handling".** Documented
   handling — `dollarsToCents` strips the minus sign rather than rejecting
   it, by design ("amounts in this app are never negative"). Tested as
   current behavior. The same stripping in `parseMilesToTenths` looks less
   deliberate, so it is recorded in BUGS.md #1b without being called a
   defect.
4. **Ambiguous matches: "verify deterministic, documented behavior".**
   `matchBatch` is greedy and batch-ordered by design, so which sale a
   payment claims *can* depend on batch order; what may not vary is the
   one-payment-one-sale invariant. **Chosen:** assert the invariant under
   permutation, and assert the greedy behavior itself with examples.
5. **`dedupe` and fuzzy transitivity.** A ~ B and B ~ C without A ~ C is
   possible, and the held copy can be replaced mid-scan. I tested what
   that actually costs (Ana/Anna/Anne collapse into one) and recorded it as
   current behavior rather than filing it — the module's own comment
   already accepts collapsing as the safer error.
6. **`test:engine` vs `npm test`.** No runner existed, so there was no
   convention to follow. Both run this suite; `test:engine` names the
   directory so it stays scoped when a second suite arrives.
7. **Property-test iteration counts.** 1,000 runs for the money laws, 500
   for the engines, 100–300 where a single case costs an `Intl` format
   (the history day labels). One test was reduced from 500 to 100 runs
   because it timed out at 5s under parallel file execution — noted inline
   at the test.

## Two things worth an hour tomorrow

- **BUGS.md #1** is a two-line fix (round, then guard) and the failing test
  is already written — delete the `.fails` and it goes green.
- **`src/app/upload-screen.tsx` is now the largest untested surface in the
  repo**, and it holds the settlement logic: conditional settlement, the
  serial write queue, the three-state link handling. That is the next
  suite, and it needs a DOM environment rather than plain Node.
