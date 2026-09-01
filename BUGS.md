# BUGS.md — what the engine suite found

Four discrepancies between what `src/lib` documents and what it does.
**Nothing was fixed.** Each one has a test that states the intended
behavior; the two that are defects in shipped code are marked
`it.fails(...)` so `npm run test:engine` stays green, and will turn green
for real the moment someone deletes the `.fails`.

Severity is the brief's scale: **money-wrong** (a figure the owner acts on
is wrong), **state-wrong** (stored or displayed state disagrees with what
the module promises), **cosmetic** (nothing downstream changes).

The headline: **no money-wrong defect was found.** Integer cents hold
through every operation, the received/owed partition never leaks, and one
payment never claims two sales. The four below are all smaller than that.

---

## 1. A distance under 0.05 miles is stored as zero instead of rejected

- **Severity:** state-wrong
- **Where:** `src/lib/mileage.ts` → `parseMilesToTenths`
- **Failing test:** `money.test.ts` → *"rejects a distance that rounds down
  to nothing, rather than storing zero"* (`it.fails`)

The module's contract says "anything unparseable is null (unset)", and the
code guards `if (!Number.isFinite(miles) || miles <= 0) return null;`. But
the rounding to tenths happens **after** that guard:

```ts
return Math.min(99_999, Math.round(miles * 10));
```

so any positive distance below 0.05 miles survives the guard and comes back
as `0`.

- **Expected:** `parseMilesToTenths(".01")` → `null` (unset)
- **Actual:** `0`

What the owner sees: they type `.01` into a client's round-trip distance,
the field saves, and the client shows `0.0` miles — a value that looks set
but behaves as unset, because `mileageLog` skips anything with
`tenths <= 0`. No mileage rows are ever produced for that client and
nothing says why. The boundary is exact: `0.049` → `0`, `0.05` → `1`.

**Smallest fix:** round first, then guard — reject when the rounded value
is `<= 0`, not when the parsed float is.

### 1b. The same guard can never see a negative number

Related, same function, and the reason the `miles <= 0` half of the guard
is nearly dead code: `input.replace(/[^0-9.,]/g, "")` strips the minus sign
before `parseFloat` runs, so `"-4"` parses as `4` and is stored as 40
tenths. Only a literal `"0"` can reach the `<= 0` branch. This mirrors
`dollarsToCents`, which strips the sign deliberately ("amounts in this app
are never negative"), so it may well be intended here too — it is recorded
rather than filed as a defect, and pinned by a passing test named *"strips
a minus sign instead of rejecting it"*.

---

## 2. Two services that earned the same amount rank by arrival order

- **Severity:** cosmetic
- **Where:** `src/lib/dashboard.ts` → `revenueByService`
- **Failing test:** `dashboard.test.ts` → *"ranks two equal earners the same
  way whatever order the rows arrived in"* (`it.fails`)

The sort is `(a, b) => b.revenueCents - a.revenueCents` with no final
tie-break. `Array.prototype.sort` is stable, so equal earners come out in
first-seen order — which is the order the ledger happened to list the
transactions in.

- **Expected:** the same two services in the same order for the same books
- **Actual:** `[svc-1, svc-2]` one way round, `[svc-2, svc-1]` the other

Nothing downstream reads the order and no figure changes, which is why this
is cosmetic. It is worth recording because every *other* ranking in this
codebase already ends with an explicit tie-break — `insights.ts` falls back
to `name.localeCompare`, `recommend.ts` does the same in both of its
ranking functions — so this one is the odd one out rather than a considered
decision.

**Smallest fix:** `|| a.name.localeCompare(b.name)` on the end of the
comparator.

---

## 3. The parked invoice prototype cannot read comma decimals

- **Severity:** state-wrong, but confined to a parked module
- **Where:** `src/lib/invoice.ts` → `dollarsToCents`
- **Test (passing, documents current behavior):**
  `providers-and-notify.test.ts` → *"does NOT read the comma decimals the
  shipped ledger accepts"*

`invoice.ts` opens with `// parked prototype — future payment-links module,
do not extend.` and carries its own money parser:

```ts
const amount = Number.parseFloat(input);
```

The shipped ledger's parser (`transaction.ts`) has a documented
whichever-separator-comes-last rule so a Brazilian typing `1.234,56` is
charged $1,234.56. This one reads the same string as **$1.23**, and
`12,34` as **$12.00**.

The two files are reachable from `invoice-builder.tsx` and
`invoice-preview.tsx`, so the divergence is live in whatever state that
prototype is in. Since the file says do-not-extend, this is recorded, not
fixed — but if the payment-links module is ever unparked, it needs the
ledger's parser, not this one.

---

## 4. The invoice prototype rounds the quantity, not the total

- **Severity:** state-wrong, same parked module
- **Where:** `src/lib/invoice.ts` → `lineTotalCents`
- **Test (passing, documents current behavior):**
  `providers-and-notify.test.ts` → *"rounds the QUANTITY rather than the
  product, unlike the ledger"*

```ts
Math.round(item.quantity) * item.unitPriceCents   // invoice.ts
Math.round(item.unitCents * item.quantity)        // sale.ts
```

2.5 hours at $10 bills as **$30** on an invoice and **$25** in the ledger.
Both produce whole cents, so neither breaks the integer-cents law — they
just disagree about the same job. Same caveat as #3: parked module,
recorded rather than fixed.

---

## Documentation that no longer matches the code

Not defects, but the repo's own "copy must match behavior" law applies to
comments too. Both are pinned by passing tests so they cannot drift
further:

- **`transaction.ts:68`** gives `"1.234.567" → 123456700` as its worked
  example of thousands grouping. That value is above `MAX_CENTS`, so the
  clamp two lines later means the function cannot return it — the real
  answer is `99999999`. Test: *"clamps the multi-group example its own
  documentation gives"*.
- **`matching.ts`** and **`extract/dedupe.ts`** both say the fuzzy name
  rules "happen to agree today". They still do — verified by identical
  cases in `matching.test.ts` and `extract.test.ts`, which will diverge
  loudly if either module changes.

---

## What was checked and found clean

Worth stating plainly, because "no findings" is a result:

- **Integer cents** through `dollarsToCents`, `totalCents`,
  `totalsByDirection`, `lineTotalCents`, `saleTotalCents`,
  `saleMarginCents`, `priceFor`, `setAsideCents` and the dashboard
  aggregates — 1,000 generated cases each, including `fc.string()` and
  `fc.anything()` straight into the parsers and validators. No fractional
  cent, no `NaN`, no float artifact, and the display round trip
  `dollarsToCents(centsToDollars(c)) === c` holds for every representable
  amount.
- **One payment, one sale** — for every generated batch, `matchBatch`
  returns links with unique transaction ids AND unique sale ids, and a
  transaction is never both linked and suggested. Holds under permutation.
- **Owed never blends into revenue** — `receivedCents + owedCents` equals
  the whole book for every generated set of sales, including rows in
  states the flow should never produce.
- **Order independence** — every total, month bucket, insight, day group
  and mileage total is identical under permutation of the same rows.
- **Purity** — no exported function in `src/lib` mutates any argument;
  checked with a structural snapshot before and after across the whole
  module surface.
- **The recurring miss counter** — pauses at exactly three, not two, not
  four; a single lingering instance counts once per catch-up walk however
  long the gap; a paid predecessor resets it; an ended template stays dead
  even with `active: true` left on the row.
