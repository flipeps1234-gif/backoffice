@AGENTS.md

# CLAUDE.md — read this before doing anything

## Who you're working with
Beginner: some Python, a little JavaScript, learning TypeScript/React/
Next.js by building this. Pair-program and teach: new concept = one
short paragraph, Python analogy when possible. If I accept code I
can't explain, stop and walk me through it.

## The product — THIS CHANGED
NOT an invoicing app. A ledger app for very small service businesses
(cleaners, landscapers, barbers) paid via Venmo/Cash App/Zelle and
cash. Core loop: upload screenshots of a payment feed → AI extracts
every transaction → pre-filled confirmation sheet (low-confidence
fields flagged, tap to fix) → swipe right = business, left =
personal → running totals climb. Manual quick-add covers cash. The
law: every flow survives "ten seconds, one hand, in a driveway."

## Status — rewritten 2026-08-13 after the v0.5 build, no optimism
Typecheck, lint and `next build` pass clean. Still ZERO automated
tests (no runner, no test script) — but the v0.5 pure logic (sale
math, cadence walk, misses/pause, matching rules) was proven against
a 39-case node harness run on the tsc-transpiled real modules, and
the flows below were driven end to end in a browser. Harnesses are
throwaway; nothing guards regressions.

EXISTS AND VERIFIED IN THE BROWSER (v0.5, this session):
- Sale flow per FLOW.md: product cards (Gain/Loss/Net, the sketch
  style), qty steppers, custom amount, checkout with self-building
  clients, recurring toggle, Paid? → cash/digital.
- OPEN → Owed tab (grouped, aged, per-client subtotals, total big,
  cash mark), EXPECTED with the 14-day resolve sheet wired.
- Matching: batch auto-link with working Undo restoring BOTH sides;
  checkout-digital match against an already-ingested payment; two
  identical candidates → picker, never a silent guess.
- Received/owed shown as two figures, never blended. Cash sales mint
  a mirror transaction linked both ways, so dashboard/CSV/totals keep
  reading one stream ("one payment, one sale" by construction).
- Recurring templates: created at checkout, anchor+1 step nextDue,
  client-page pause/resume, 3-miss self-pause (harness-proven).
- Products page with margins; clients list/detail/history/edit;
  homepage per the owner's spec (connected New sale / Log again).
- Everything from v0.1–v0.4 that was verified before still stands.

EXISTS BUT UNTESTED / UNPROVEN:
- Every v0.5 PERSISTENCE path. Local dev has no Supabase, so sales/
  clients/templates round-tripping through Postgres, the 0006 data
  migration, and recurring generation on app open (it is gated on a
  signed-in account) have never run against a real database.
- Migrations 0001–0007 have NEVER been run against the live project
  (the DB was paused, then found empty). The combined one-paste file
  is regenerated and delivered; production saves NOTHING until it
  runs. This is still the #1 item in FRAGILE.md and DEPLOY.md.
- The real OpenAI extraction path post-v0.5 (matching runs on
  confirmed batches; only exercised with stubbed extraction).

MISSING / KNOWN GAPS (deliberate cuts, not accidents):
- Recurring template EDIT (line items, future instances only) and
  explicit END are not wired — only pause/resume shipped. The spec
  named them; say the word and they land in a follow-up.
- Client "default services" and STORED remembered prices were cut in
  favour of deriving "their usual" from sales history (the
  customer-memory stance). Notes shipped.
- Anonymous (signed-out) sessions do not generate recurring
  instances — generation lives in the account-gated load path.
- Everything in FRAGILE.md that was open remains open: no delete
  anywhere (now including sales), en-US-only money parsing (v0.6 is
  the bilingual milestone), /eval still not wired.

PARKED, CONFIRMED UNREACHABLE:
- invoice-builder prototype — unchanged, still unreachable, still
  carrying unmigrated float math. Fine while parked.

FLOW.md is the spec of record for the sale flow and matched the
build at commit time (deviations listed above are ABSENCES, not
contradictions). An adversarial review of the v0.5 diff was running
when this Status was written; its confirmed findings and fixes land
as follow-up commits.

Doc-consolidation pass (2026-08-13, docs only — no feature code). Each
edit was applied idempotently; all seven were ABSENT beforehand and
NEWLY APPLIED (nothing was already present to merge or dedupe against,
except the vague "everything-bundle (~$15/mo)" line, which was
superseded by the Bundle $12/mo · $99/yr menu):
- Monetization → v0.5 tier mapping (free vs premium): NEW.
- Monetization → four-module menu + seats + tax + launch rules: NEW
  (replaced the older loose module list and bundle price).
- Roadmap v0.6 → global search + optional photos/notes: NEW.
- Roadmap v0.6.5 → tax-story gaps (mileage-lite, set-aside nudge,
  Schedule-C categories, proof-of-income PDF): NEW.
- Roadmap v0.8 → optional Plaid bank feeds: NEW.
- FLOW.md CHECKOUT → `photo/notes (opt.)`: NEW, and marked
  spec-ahead-of-build (it is a v0.6 item, not in the v0.5 code). It is
  the only flow-touching change in the pass; the rest of FLOW.md was
  re-verified against the implementation with no drift (see FLOW.md's
  Implementation sync note).

## Roadmap — strict order, one milestone at a time
- v0.1 Ledger core: multi-select screenshot upload → extraction →
  confirmation sheet → swipe → running totals. In-memory is fine.
- Instant insights (HARD REQUIREMENT, part of the free core): after
  the first confirmed batch, immediately show at least three —
  period total, busiest day, top payer. The first upload must teach
  the user something they didn't already know. This is the payoff
  that earns the next upload; it is never gated, never metered.
- v0.2 Persistence & manual entry: Supabase auth + db. Transactions
  (payer, amount_cents, date, memo, source: screenshot|manual,
  service_id nullable, business boolean). Amount-first numpad
  quick-add, service chips, "save as a service?" prompt, "log
  again" on any row.
- v0.3 Catalog depth + expenses: services carry flat OR rate
  pricing (per sqft / hour / room) with inline mini-calc;
  per-customer remembered price and size; receipt photo → expense
  via the same extraction engine; optional cost field on catalog
  items (per-unit estimate, editable at save-as-service time).
- v0.4 Dashboard + tax export: money in/out, revenue by service,
  monthly summary, CSV "give this to your tax preparer."
  Margin view — revenue minus estimated costs per service. Margin
  uses catalog cost ESTIMATES; the tax export uses ACTUAL logged
  expenses only. Never mix the two.
- v0.5 Sales, clients, recurring & matching — THIS BUILD. FLOW.md is
  the authoritative spec for this flow; any change to the flow updates
  FLOW.md in the same commit. Clients (self-building from sales), the
  sale flow (products → checkout → Paid? → cash/digital), sale states
  OPEN | EXPECTED | PAID, the Owed tab, recurring templates as
  EXPECTED REVENUE (never scheduling), and the matching engine that
  links ingested transactions to sales. Totals show received and owed
  as two separate figures — owed is never blended into revenue.
- v0.6 Bilingual EN/ES/PT + polish. This build is the demo. Also:
  global search across sales/clients/transactions; optional photos +
  notes on sales (proof-of-work).
- v0.6.5 Tax-story gaps: mileage-lite (one-time distance per client ×
  logged visit count = computed mileage log; never GPS, never
  background tracking); quarterly set-aside nudge (informational
  percentage only — no tax engine); Schedule-C-grade expense
  categories on receipts; proof-of-income PDF export.
- v0.7 Native/Expo port. Revisit trigger unchanged: install friction
  on iOS, where there is no install prompt at all (see IDEAS.md).
- v0.8 Optional bank feeds (Plaid) as the top rung of the reliability
  ladder; Zelle coverage arrives via feeds. Screenshot-first remains
  the product's default and identity.
Never start the next milestone or out-of-scope features unprompted —
make me say "milestone done" first.

## Monetization architecture (context only — build NO billing)
Modular pay-per-feature, prices conceptual. Free forever and
untouchable: the core loop, manual logging, viewing ALL history at
any age, exporting their own data, every language.

v0.5 tier mapping. FREE forever: the sale flow, clients, the Owed tab,
manual one-tap matching (correctness is never paid), the expected
flag/resolve. PREMIUM (future gate): automatic matching & Owed
auto-clear, recurring templates, WhatsApp owed-alerts — the "runs
itself" layer. Everything ships enabled for all users now; premium
features are flagged in code structure only. No billing code until an
entity + Stripe exist. The founding cohort is grandfathered.

Module menu — à la carte, MAX FOUR EVER (a new premium feature joins an
existing module, never spawns a fifth):
- Autopilot $6/mo — auto-matching, Owed auto-clear, recurring.
- Alerts $5/mo — the WhatsApp layer: owed-alerts, confirmations,
  weekly digest.
- Insights $5/mo — reports, margins, year-in-review; benchmarking
  later at density.
- Time Machine $4/mo — version history, point-in-time restore,
  deleted-entry recovery, multi-device sync.
Bundle $12/mo or $99/yr = all four. Seats: a separate stacking add-on
when multi-user unparks ($10 first five, $1/seat after — conceptual).
Tax: per-event ($99 / $149 pro-reviewed), NEVER a module; bundle
members get $20 off filing. Payment links stay a per-transaction item
(2028), also not a module.
Pricing page is bundle-first; upsells are contextual, at the gated
feature only. Gate-on launch sells Bundle + Autopilot only; the other
modules unshelve on demand. Launch pricing is deliberately
under-market; any future repricing applies to NEW users only — an
existing user's price never rises.
Insights boundary — the three instant insights (period total,
busiest day, top payer) are core and free forever. The paid module
is depth on top: trends over time, per-service margin, comparisons,
forecasts. Never move a free insight behind the paywall; that is
un-crippling the core, which the filter below forbids.
Filter: modules charge for value ADDED on top of their data — never
to un-cripple the core, never to meter their own records. Sell what
we built on their data; never sell their data back. Today: zero
billing code, zero caps, zero paywall flags. Schema stays neutral —
don't hard-couple account = one user, but multi-user stays parked.

## Engineering rules
- Money is integer cents everywhere. The invoice prototype rounds
  floats — migrate anything we reuse.
- Extraction is one swappable module: extract(image | text) →
  Transaction[], schema-validated. Provider behind an interface; we
  bake off OpenAI / Anthropic / Gemini on /eval.
- /eval folder: every extraction I correct is saved as input +
  correct answer.
- Dedupe before the sheet renders: fuzzy payer + amount + date
  across overlapping screenshots.
- Venmo's social feed shows no amounts — detect it and show
  "screenshot your Transactions tab instead." Never fail silently.
- Logic lives in src/lib as pure TypeScript; components only render.
  Money math, extraction, validation, dedupe — none of it touches the
  DOM. Server work stays behind API routes. This is not style: it is
  what keeps a future native port a screen rewrite instead of an app
  rewrite, and it keeps the door open for free. Native itself stays
  parked (see Hard boundaries + IDEAS.md) — the reason to revisit is
  install friction on iOS, where there is no install prompt at all.
- Commit early/often, suggest messages. One feature per session.
  Ask before ANY new dependency; boring wins. Test data only — my
  own or synthetic screenshots, never real customer data.
- One payment, one sale: an ingested transaction linked to a sale
  counts ONCE. Ledger totals = sales + unmatched ingested business
  transactions. Never double-count across streams.
- Recurring = expected revenue, NOT scheduling: no times, no job
  reminders, no client notifications. Calendar remains parked.

## Hard boundaries — see IDEAS.md; refuse and remind me if I drift
No payments or Stripe. No billing, subscriptions, paywalls, or
usage caps. No tax-filing logic. No scheduling/calendar. No
quotes/estimates. No dynamic pricing. No multi-user. No native
mobile. No invoice/PDF work. No scraping or connecting to payment
accounts — users upload their own screenshots. Permanent: never
gate viewing or exporting a user's own data. No ads. No selling
data. No charging for language.

## Deploying
Pushing to main IS deploying — Vercel promotes every push and there is
no staging, no CI and no tests. See DEPLOY.md: the gate is
`npx tsc --noEmit && npm run lint && npm run build` run locally, and
three one-time config items that break production silently if skipped.

## Session ritual
End every session: what changed, one concept I should now be able
to explain, the exact next step.
