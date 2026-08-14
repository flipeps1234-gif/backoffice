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

## Status — rewritten 2026-08-14 after the v0.6 + v0.6.5 build, no optimism
Typecheck, lint and `next build` pass clean. Still ZERO automated
tests (no runner, no test script) — the pure logic old and new is
proven against a throwaway 52-case node harness on the tsc-transpiled
real modules; nothing guards regressions between sessions. A 47-agent
adversarial review ran over the entire v0.6+v0.6.5 diff (5 lenses,
2 refuters per finding); its 11 confirmed defects are FIXED
(commit 095e34e) — two of them were real money corruption
("0.125"/sqft parsing as $125.00; type="number" silently defeating
comma-decimal entry 100×).

EXISTS AND VERIFIED IN THE BROWSER (v0.6 + v0.6.5, this session):
- Trilingual EN/ES/PT: 380+ typed keys across 15 per-screen
  fragments; header switcher on every screen incl. the terms gate;
  locale detected then per-device; ES is LatAm tú, PT is Brazilian
  você. Verified live: home, sale flow, owed rail, terms, in all
  three languages. Money deliberately stays $ en-US; CSVs stay
  English (documented in i18n.ts, with everything else that is
  deliberately not localized).
- Comma-decimal money entry end to end: "1.234,56" typed into the
  custom-amount field totals $1,234.56 (fields are text +
  inputMode="decimal" — type="number" was eating the comma before
  the parser ever saw it).
- Global search (rail + phone home): accent-blind ("rósa" finds
  Rosa), AND-tokens, amounts in typed AND displayed formats; client
  results open the client's page directly; guarded so a search tap
  never destroys a half-typed entry.
- Photos/notes on sales: collapsed checkout row → note shown on the
  client's history (photo pipeline: compressed ~≤300KB JPEG data URL
  in the sale row). Terms gained the "photos are kept" block in all
  three languages; TERMS_VERSION bumped and the re-prompt verified.
- Tax story: set-aside nudge ($200 quarter → $50, info-only wording),
  mileage estimate (2 visits × 12.5 mi → 25.0, never GPS, open
  recurring instances excluded as phantom trips), Schedule-C category
  chips/select feeding a new tax-CSV column, proof-of-income print
  view with disclaimer (window.print IS the PDF export).
- Everything verified in v0.1–v0.5 still stands.

EXISTS BUT UNTESTED / UNPROVEN:
- Every persistence path for the NEW columns (notes, photo, category,
  distance_tenths) — local dev has no Supabase. IMPORTANT: the code
  now SELECTS these columns, so a production DB stops loading sales/
  transactions/clients until migrations 0010–0011 run. The combined
  one-paste file (0001–0011, idempotent) is regenerated and
  delivered; migrations have STILL never been run against the live
  project.
- Photo attach through a real OS file dialog (the compression code
  path is reviewed but was not driven in the browser; a failed photo
  can never block the sale by design).
- The printed output of proof-of-income (the view is verified; the
  actual print dialog was not driven).
- ES/PT translations are agent-written and QA-swept for register/
  consistency, but NOT native-speaker-reviewed. The owner reads PT —
  a pass over messages/*.ts would be worth an evening.

MISSING / KNOWN GAPS (deliberate, or pre-existing and documented):
- API route error bodies surface in English (server doesn't know the
  device language; needs error codes in the contract — noted in
  i18n.ts, deferred).
- Extraction never guesses a category — receipts are categorized by
  hand on the sheet. Deliberate: a guessed tax label is worse than a
  blank one.
- "Log again" on a sale still collapses extra custom lines to one at
  qty 1 — PRE-EXISTING (v0.5), surfaced by the review, out of the
  v0.6 diff, still open.
- No delete anywhere; /eval still not wired; anonymous sessions still
  don't generate recurring instances.

Settings page (v0.6.6, 2026-08-14, same-day follow-up): language,
appearance (system/light/dark — dark mode is now CLASS-based with a
pre-paint inline script per the Next flash-prevention guide, so the
override wins over the OS with no flash), and the sale-flow order the
v0.5 session parked ("settings tab we add later on") — products-first
with recommended-client chips at checkout, or client-first with a
WHO'S IT FOR? step and the client's usual services floated on top.
Recommendations are DERIVED from sales history (lib/recommend.ts,
harness-proven), never stored, never filters. All three settings are
per-device (localStorage, no migration — boring wins). Browser-
verified both orders, the light override on a dark device, and
persistence through reload. FLOW.md updated in the same commit.

Settings, full build-out (v0.6.7, 2026-08-15): Business (the FIRST
account-level settings — name/owner/state, migration 0012; tops the
tax CSV and titles the proof of income), Services & clients links,
Notices (two HONEST toggles gating in-app banners — monthly recap and
a Jan–mid-Apr tax pointer; no push infra exists and none was faked;
WhatsApp row grayed "coming soon"), Data & privacy (export-everything,
plain-language promise, and ACCOUNT DELETION: type-your-email confirm,
7-day cancellable window, server-side purge via pg_cron + SECURITY
DEFINER in migration 0013 — the terms' "nothing can be deleted"
promise flipped, so the terms changed and TERMS_VERSION bumped again),
Backup (a truthful status line: instant when signed in, "nothing is
saved" when not), Help & about (WhatsApp support link gated on
NEXT_PUBLIC_SUPPORT_WHATSAPP — see DEPLOY.md — read-only terms viewer,
version). Recap/tax-CSV/profile logic harness-proven (13 cases);
banners, terms re-prompt, business save and dismissal markers
browser-verified. UNTESTED like all persistence: profile/deletion
round-trips and the pg_cron purge have never run against a real DB.

PARKED, CONFIRMED UNREACHABLE:
- invoice-builder prototype — untouched by the i18n pass (parked,
  unreachable, float math). Fine while parked.

FLOW.md is the spec of record and matches the build: the
`photo/notes (opt.)` line shipped the same day it was drawn, so the
chart has NO spec-ahead-of-build entries left.

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
- v0.6 Bilingual EN/ES/PT + polish — SHIPPED 2026-08-14. This build
  is the demo. Also shipped: global search across sales/clients/
  transactions; optional photos + notes on sales (proof-of-work).
- v0.6.5 Tax-story gaps — SHIPPED 2026-08-14: mileage-lite (one-time
  distance per client × logged visit count = computed mileage log;
  never GPS, never background tracking); quarterly set-aside nudge
  (informational percentage only — no tax engine); Schedule-C-grade
  expense categories on receipts; proof-of-income via print-to-PDF.
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
