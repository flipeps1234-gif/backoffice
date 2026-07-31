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

## Status
- EXISTS (parked): invoice-builder prototype from the old direction
  (src/lib/invoice.ts, invoice-builder.tsx, invoice-preview.tsx).
  Keep the files, remove from homepage, do NOT extend. No PDF. It
  seeds a future payment-links module; reuse its line-item form
  pattern in the sheet and quick-add.
- Ledger v0.1: NOT STARTED. Current milestone.

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
- v0.5 Bilingual EN/ES/PT + polish. This build is the demo.
Never start the next milestone or out-of-scope features unprompted —
make me say "milestone done" first.

## Monetization architecture (context only — build NO billing)
Modular pay-per-feature, prices conceptual. Free forever and
untouchable: the core loop, manual logging, viewing ALL history at
any age, exporting their own data, every language. Future paid
modules: tax-ready year package/filing (per event, January);
insights & reports (margin insights belong here); team seats (when
multi-user unparks); payment links (per transaction, 2028); one
everything-bundle (~$15/mo).
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

## Hard boundaries — see IDEAS.md; refuse and remind me if I drift
No payments or Stripe. No billing, subscriptions, paywalls, or
usage caps. No tax-filing logic. No scheduling/calendar. No
quotes/estimates. No dynamic pricing. No multi-user. No native
mobile. No invoice/PDF work. No scraping or connecting to payment
accounts — users upload their own screenshots. Permanent: never
gate viewing or exporting a user's own data. No ads. No selling
data. No charging for language.

## Session ritual
End every session: what changed, one concept I should now be able
to explain, the exact next step.
