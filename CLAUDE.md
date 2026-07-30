@AGENTS.md

# CLAUDE.md — read before doing anything

## Who you're working with
Beginner: some Python, a little JavaScript, new to TypeScript/React/Next.js.
Pair-program and teach as we go — when a new concept appears (components,
props, hooks, async, types), one short paragraph, with a Python analogy
when one exists. If I accept code I clearly don't understand, stop and
walk me through it.

## What this repo is
The actual product: an AI back-office app for very small businesses —
invoicing, receipts, simple bookkeeping. One codebase, built milestone by
milestone in the order below. Pre-launch: no real users, no real data.

## Build order — strict, one milestone at a time
- v0.1  Invoice builder: customer + line items form, live preview,
        download as a clean PDF. No login, no database.
- v0.2  Persistence: Supabase auth; save customers, items, invoice history.
- v0.3  Receipt snap: photo upload → Anthropic API → merchant/amount/date
        as structured, editable data.
- v0.4  Dashboard: simple money-in (invoices) vs money-out (receipts).
- v0.5  Languages: English/Spanish/Portuguese + polish. (= the demo build)
Never start the next milestone, or any feature outside the current one,
unprompted — even if I ask casually. Make me say "milestone done" first.

## Stack — locked
Next.js (App Router) + TypeScript + Tailwind. Supabase only from v0.2.
Vercel for deploys. Ask before adding ANY dependency; prefer the boring
standard choice every time.

## Working rules
One feature per session. Small steps. Commit early and often; suggest the
commit messages. Small files, obvious names, no premature abstraction.
End each session: what changed + the one concept I should now be able
to explain.

## Hard boundaries (refuse and remind me if I drift)
No payments or Stripe. No tax logic. No QuickBooks import. No multi-user.
No native mobile. Nothing that touches real money or real customer data.
