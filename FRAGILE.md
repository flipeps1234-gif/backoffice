# FRAGILE.md

The ten things most likely to break on real input, ranked. Audited
2026-08-04 against v0.4. Ranked by *expected damage*: how likely it is to
happen × how bad it is when it does × how hard it is to notice. Silent
wrongness outranks loud failure — a red banner gets fixed, a quietly wrong
total gets filed with the taxes.

Every item below was traced in the code. Where a claim was testable, it was
tested; those are marked **verified**.

---

## 1. Migrations 0003 and 0004 may never have been run

`supabase/migrations/0003_direction.sql` adds `direction`,
`0004_quantity.sql` adds `quantity`. Both are applied by hand in the
Supabase SQL editor, and I have never had confirmation they were run
against the live project.

[`toRow`](src/lib/supabase/transactions.ts:38) writes both columns and the
select reads them. If either migration is missing, **every insert and every
load fails** — the app looks completely broken to a signed-in user, while
working perfectly in the anonymous local build where there is no database.

*Trigger:* deploying, or any signed-in use, if the SQL was skipped.
*User sees:* "Couldn't load your saved payments", or rows that appear on
screen and vanish on refresh.
*Fix:* run both files. This is the single highest-value thing on this list.

## 2. Non-English money formats silently lose 99% of the amount — **verified**

[`dollarsToCents`](src/lib/transaction.ts:51) strips everything that is not
a digit, dot, or minus, then `parseFloat`s. Run against real input:

```
"1.234,56"  ->  123 cents   ($1.23, not $1,234.56)
"1,234.56"  ->  123456 cents (correct)
```

The comma-decimal convention is standard in Brazil, Spain, Mexico and most
of Latin America. This function backs the **confirmation sheet's amount
field** ([confirmation-sheet.tsx:123](src/app/confirmation-sheet.tsx:123))
and the service rate/cost inputs — the exact fields a user corrects when
the extractor got a number wrong.

v0.5 is the bilingual EN/ES/PT milestone. Shipping Spanish and Portuguese
on top of an en-US-only money parser turns a translation into a money bug
for the people the translation is for. **Fix this as part of v0.5, not
after it.**

## 3. Extraction can fail completely and silently

At [upload-screen.tsx:285](src/app/upload-screen.tsx:285): if every chunk
returns HTTP 200 with zero transactions and zero warnings, the code sets
`status = "error"` — but `error` was cleared to `""` at the start of the
run and nothing ever set it. The banner renders **an empty red box**.

This is the exact failure the engineering rules forbid ("Never fail
silently"), and it is reachable from the most ordinary bad input there is:
a screenshot the model could not make sense of.

*Trigger:* a blurry photo, a non-payment screenshot, or a model response
that parses to `{transactions: [], warnings: []}`.
*User sees:* an empty red rectangle. No explanation, no suggestion.

## 4. Malformed rows are dropped without telling anyone

[`validateExtraction`](src/lib/extract/validate.ts:88) drops any row whose
`amountCents` is not a whole number in range, and adds no warning to
compensate. This is the right call for robustness — one bad row used to
reject the entire batch insert — but the user is never told.

*Trigger:* the model returns `64.5` cents, or a negative, for one row.
*User sees:* four payments in the sheet when the screenshot showed five.
Nothing indicates one was discarded. They have no reason to look.

## 5. Two identical payments on the same day collapse into one

[`dedupe`](src/lib/extract/dedupe.ts:65) matches on direction + amount +
date + fuzzy payer. Two genuinely separate payments — same client, same
price, same day — are indistinguishable from one payment read twice.

The code documents this and argues the trade-off is correct ("a missing row
is visible, a silent double-count isn't"). That reasoning holds. But it is
squarely in the path of the target user: a barber who cuts the same
client's hair twice in a day, or a cleaner paid for two units at one
address, loses a payment.

*Trigger:* two real payments, same payer, same amount, same day.
*User sees:* one row. Their total is short and nothing says why.

## 6. Anyone who learns the demo word spends your OpenAI budget

[route.ts:125](src/app/api/extract/route.ts:125): the shared tester account
gets the **real** provider. `DEMO_EXTRACTION=mock` flips it back, and that
variable is not set.

The rate limiter is an in-memory `Map`
([route.ts:36](src/app/api/extract/route.ts:36)) — per serverless instance,
so the real ceiling is 30/minute × however many instances Vercel spins up.
The code says so honestly in its own comment; it is a brake on casual
abuse, not a budget control.

*Trigger:* the demo word reaching anyone who wants to burn $50.
*You see:* an OpenAI bill, at the cap, with no per-user attribution.
*Fix available today:* set `DEMO_EXTRACTION=mock` in Vercel. No code change.

## 7. Venmo social-feed detection is one sentence of prompt

The named path is complete and correct: the warning code, the exact
required message ("Screenshot your Transactions tab instead"), and the UI
that shows it. But the *detection* is a single line of instruction to the
model ([openai.ts:27](src/lib/extract/openai.ts:27)). There is no
deterministic check, and nothing measures how often it fires.

The mock triggers on a filename containing "social" — test-only. So the
one behaviour that has ever been exercised is the one that cannot ship.

*Trigger:* a real Venmo social-feed screenshot.
*User sees:* either the right message, or item #3 above. Unknown which.
The extraction path as a whole is confirmed working — this is narrower:
no one has fed it a social feed, which is the one input this branch
exists for.

## 8. The database-reload path skips dedupe entirely

[upload-screen.tsx:135](src/app/upload-screen.tsx:135): `loadTransactions()`
puts rows straight into state, and any with `business === null` go to the
confirmation sheet. No dedupe runs on that path — dedupe only guards the
upload path.

There is also no database-level uniqueness backstop: `transactions` has
only a primary key on a client-generated uuid
([0001_transactions.sql:8](supabase/migrations/0001_transactions.sql:8)).
Every duplicate defence in this app is client-side and in-memory.

## 9. Nothing can be deleted

There is no delete anywhere in the app. `ConfirmationSheet` exposes only
field edits, and history and dashboard have none. A row that arrives wrong
— a duplicate that slipped through, a test entry, a screenshot uploaded to
the wrong account — is permanent. It can be edited to `$0.00` and left
sitting in the ledger, and that is the whole remedy.

This compounds every item above it: each of #1, #4, #5, #8 produces a wrong
row, and none of them can be cleaned up.

## 10. No automated tests exist

No runner, no test file, no test script — `package.json` has `dev`,
`build`, `start`, `lint`. Typecheck, lint and `next build` all pass, and
that is the entire safety net.

Every behaviour claimed to work in CLAUDE.md was verified by hand, in a
browser, once. Most of mine ran against *stubbed* network responses; the
real extraction path is confirmed working by the owner, not by me.

Either way the gap is the same: one manual pass proves a thing worked
once, on one input, on one machine. Nothing prevents any of it
regressing, and every review pass that found a real bug in this codebase
found it by reading the code, not by running it.

---

## Deliberately not on this list

- **Float money math.** Audited: every division in live code is display-only,
  and both rate multiplications round to whole cents
  ([service.ts:35](src/lib/service.ts:35),
  [dashboard.ts:125](src/lib/dashboard.ts:125)). The float issues in
  `src/lib/invoice.ts` are real but that file is confirmed unreachable —
  nothing outside the parked trio imports it.
- **Half-cent rounding.** `dollarsToCents("8.165")` gives 816, not 817.
  True, and irrelevant: it needs a three-decimal amount, and it is off by
  one cent.
- **The anon key being public.** By design. RLS is the gate, and all four
  policies are correctly scoped to `auth.uid() = account_id`.
