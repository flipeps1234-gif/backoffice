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

PRODUCTION-VERIFIED 2026-08-15, live E2E on the tester account AFTER
the owner ran the combined 0001–0015 file in the Supabase SQL editor:
- Sale with a note round-tripped a hard reload (0010); client
  distance "8,3" saved and the mileage estimate computed (0011);
  expense saved with its Schedule-C category (0011); business
  profile saved and reloaded (0012); notification prefs saved
  WhatsApp + number + timestamped consent, then flipped back to
  Off — BOTH states survived reload (0014/0015).
- Comma-decimal money entry proven live ("120,50" → $120.50) and
  accent-blind search too ("marquez" finds Rosa Márquez).
- The demo account correctly shows "can't be deleted" — the guard
  working as designed, which also means the deletion round-trip
  itself has only ever run against RLS in review, never live.
- One transient console error at the instant of demo sign-in:
  "JWT issued at future" (Supabase clock vs. device clock, seconds
  of skew) — the very first load after minting failed, the next
  succeeded. Recoverable by design, but a device with a badly wrong
  clock would see it every time. Not fixed, just known.

EXISTS BUT UNTESTED / UNPROVEN:
- The pg_cron purge: cron.job is invisible from outside — the owner
  must confirm `select * from cron.job;` shows purge-deleted-accounts
  once, or account deletion never actually purges.
- Photo attach through a real OS file dialog (the compression code
  path is reviewed but was not driven in the browser; a failed photo
  can never block the sale by design).
- The printed output of proof-of-income (the view is verified; the
  actual print dialog was not driven).
- ES/PT translations are agent-written and QA-swept for register/
  consistency, but NOT native-speaker-reviewed. The owner reads PT —
  a pass over messages/*.ts would be worth an evening.

Find-and-fix pass (2026-08-16, five never-run review lenses —
schema-drift, copy-vs-behavior, product-semantics, resilience,
authz/exposure — each finding adversarially verified before fixing;
the authz lens over all six API routes and every RLS policy came
back CLEAN). Ten distinct defects found and NINE fixed, harness-
proven (19 cases) and browser-smoked:
- Cash-sale writes were two separate queue items with no idempotency
  guard: a dropped fetch or tab kill could persist a paid sale with
  no money row, or leave the mirror txn while "Got cash" re-minted a
  second one (doubled revenue). Now: one queue item per logical pair
  (paySaleCash, handleSaleDone, linkSaleToTxn, undoMatches), txn
  inserted before the sale so failure residue keeps totals right,
  and paySaleCash reuses an existing mirror instead of minting.
- The save-failure banner rendered only inside mainLoop, which mobile
  takeovers REPLACE — "Got cash"/quick-add during an outage looked
  fully successful and lost everything. The banner now lives in the
  shared wrapper above {takeover ?? mainLoop}.
- After a failed initial ledger load the app stayed writable and the
  duplicate screen compared re-uploads against an EMPTY in-memory
  ledger — one transient failed GET away from double-counting every
  row. Uploads now refuse while loadFailed until a reload.
- "Export everything" exported only transactions while the delete
  flow called the CSV the user's copy: the owed book, clients, notes
  and templates were in NO export. everythingCsv is now sectioned
  (payments/sales/clients/recurring); photos stay out and the delete
  copy now says so in all three languages.
- Settings' backup line watched the transient error string, not the
  sticky saveFailed flag — green after a lost write, amber after a
  mere file-type mistake. Now wired to saveFailed.
- A cleared date field made a sale violate occurred_on NOT NULL (sale
  lost, mirror txn kept) and recurring's advance("") threw. Empty
  date now means today at finish time.
- Re-ticking consent after an inbound STOP wrote back the PRE-STOP
  timestamp and erased the STOP — the exact record a Meta/carrier
  dispute reads as ignoring one. A re-opt-in now stamps the fresh
  tick (old timestamps survive only if no STOP postdates them).
- Both webhooks wrote provider status strings into the queue's
  CHECK-constrained column; Meta's 'deleted'/'warning' and Twilio's
  'accepted'/'sending'/'canceled' would fail the CHECK and silently
  freeze the row. Both now whitelist what the schema holds.
- Digitally-matched sales lost service attribution (cash jobs
  attributed, digital ones landed under "No service"): the matching
  engine's link writes now stamp the same saleProvenance the cash
  mirror uses, and undo restores what was there.
- Search now finds pt-BR/es full-format amounts ("1.234,56") the
  entry fields already accept.
DEFERRED from the same pass, documented not fixed: a stale client
list on a second device can insert a duplicate-named client, fail
the unique index, and take the dependent sale down with it (the
cash mirror survives as an orphan). Needs an on-conflict re-query
that remaps the sale's client_id — do it deliberately, not inline.

Public surface (v0.6.8, 2026-08-16): landing + help center + legal,
all in the main repo — this doubles as the app-store support URL at
v0.7. The APP MOVED from / to /app (signed-in visitors on / bounce
there client-side; auth is device-local so the server can't know).
design-tokens.md (repo root) is the audited palette and the LAW for
public pages: no color, face or component style the app doesn't
already use. What shipped:
- / landing: single column ~640px, hero + founding-hundred email
  capture (migration 0016: founding_list, INSERT-only RLS, the list
  is never readable with the anon key; /api/founding rate-limited,
  duplicates return ok). Demos are the REAL components, inert inside
  plain frames, marked "Demo data" — and since 2026-08-22 they mirror
  the audited Ledger Mockups screen for screen: the hub's DropZone,
  the confirmation sheet with an amber flag, Insights + SwipeDeck
  (the real sorting stage), RunningTotals + Dashboard (mount-gated:
  Dashboard reads today's date), and OwedTab with the mockups' three
  clients (one past the 14-day flag, one recurring). The two hand-
  drawn illustrations the first build shipped (a dashed "Venmo ·
  Cash App · Zelle" box and a ←/→ mini swipe card) are gone — the
  mockup audit rejected exactly that kind of invented chrome.
- /help + /help/[slug]: public, static, searchable (the app's own
  accent-blind fold()), rendering help-docs/{en,es,pt}/*.md — SINGLE
  SOURCE for help content, never fork it; a missing translation
  fails the build. Hand-rolled markdown reader in lib/markdown.ts
  (no deps). Six articles × three languages shipped.
- /privacy and /terms COMPOSE the same i18n keys as the in-app terms
  gate and settings promise — no forked legal copy; a plain "lawyer
  text will replace this" note sits on both.
- SEO: per-page metadata, metadataBase, sitemap.ts, robots.ts
  (disallows /app and /api), opengraph-image.tsx drawn from the
  token palette. Everything prerenders static.
- Deviation from the spec, on purpose: logged-out visitors to /app
  see the app's own sign-in gate (which IS the front door — demo
  word included), not a redirect to the landing; a redirect would
  kill the try-anonymously flow.
- Landing/help/legal browser-verified EN + ES (PT is same-mechanism,
  same-authorship). Founding capture NOT tested against production —
  migration 0016 must run there first (combined file regenerated).
  Known dev-only console noise: React warns about the layout's
  pre-paint theme <script> on client navigations (it only needs to
  run at first parse; behavior correct in prod).
Slop-list self-audit (banned: gradient heroes, purple/indigo, emoji
icons, three-column feature cards, stock illustration, fake
testimonials/logo bars, floating blobs, buzzwords, neon glow):
ZERO violations to fix — the token discipline made them
unrepresentable. Full report in the session log.

Company website (v0.6.9, 2026-08-22): the public surface grew from a
landing page into a multi-page site, all static, all in the main app,
all trilingual through the same i18n (new fragment
src/lib/messages/site.ts, ~190 keys × 3). Routes: / · /how-it-works ·
/pricing · /for/{cleaners,landscapers,barbers} (one SSG page per
trade, generateStaticParams, unknown trade = 404) · /about · /contact
· /faq, plus the existing /help, /help/[slug], /privacy, /terms. Every
illustration is a real component fed demo data (public-demos.tsx is the
one source for the fixtures; founding-cta.tsx the one CTA). SEO
plumbing: lib/site.ts (SITE_URL from NEXT_PUBLIC_SITE_URL, Vercel
fallback; the public-page map the sitemap/footer/breadcrumbs share),
lib/seo.ts (pageMetadata: title + description + canonical + the SHARED
OG/Twitter base — Next replaces nested metadata objects instead of
merging, a review catch that had every subpage shipping an imageless
card), JSON-LD per page (Organization, WebSite, SoftwareApplication,
BreadcrumbList, FAQPage from the same list the page renders), title
template in the root layout, sitemap.ts + robots.ts off the one URL,
/app noindex. Analytics: analytics.tsx loads GA4 only with
NEXT_PUBLIC_GA_MEASUREMENT_ID, public pages only (the two ways into
/app are full-document navigations and the ga-disable flag is set
inside the app), Do Not Track honored, page views from GA4's own
config + Enhanced Measurement (no manual page_view — double-counts).
The privacy page discloses exactly that. Pricing is bundle-first and
honest: free forever list, founding hundred $6/mo, the four modules
named but unpriced, and the correction from review that parts of them
already ship free today. A 13-agent adversarial pass (SEO, truth,
tokens, i18n, analytics) confirmed 8 defects, all FIXED, plus the
overflow and lows taken: the OG merge bug, help-article descriptions
built from a raw search-text slice, the pricing "none exists yet"
falsehood, "never/ever" bank-login absolutes vs the v0.8 roadmap, a
34px header button, ES/PT naming the Owed tab "Te deben"/"Devendo"
instead of the app's "Por cobrar"/"A receber", "Also built for For
landscapers", the AI-transfer of screenshots now disclosed in the FAQ
and walkthrough, "everything deletable" softened to what is true.
Slop-list self-audit over all 19 new files: zero banned words, zero
banned styles, palette in use = neutral/emerald/amber/red only
(positive-controlled grep — the first pass was invalid because zsh
doesn't word-split, and was redone). UNTESTED: GA4 against a real
property (no ID exists yet — set NEXT_PUBLIC_GA_MEASUREMENT_ID and
redeploy to turn it on); share cards in a real scraper (the built HTML
was checked for the tags, not the rendered card); ES/PT still agent-
written, not native-reviewed. The domain went
primary the same day: production is https://getcontado.com (the
vercel.app origin 307s to it), so SITE_URL's fallback IS the domain —
the live canonicals/sitemap pointed at the redirecting Vercel URL for
one deploy and were corrected. Owner-side: NEXT_PUBLIC_SUPPORT_EMAIL,
NEXT_PUBLIC_GA_MEASUREMENT_ID when a GA4 property exists, and the
pg_cron purge check (now a BLOCKING item in DEPLOY.md because the
site promises it).

Keyword build-out (2026-08-23, same day): every keyword cluster the
brand can own now maps to exactly ONE page — documented in lib/seo.ts
("one page per cluster") and enforced by review. NEW: /track/{venmo,
cash-app,zelle,cash} own the payment-channel clusters ("Venmo
bookkeeping", "Cash App bookkeeping", "Zelle payment tracking", "how
to track cash income"), trilingual, real-component demos, FAQPage +
breadcrumbs markup, in the sitemap and a fourth footer column. /faq
gained three long-tail questions (who owes me / prove cash income /
separate Venmo). JSON-LD: Organization alternateName "getcontado",
SoftwareApplication featureList. Home keeps brand + head terms only.
The 8-agent adversarial pass on this copy confirmed and FIXED a HIGH
truth defect: the cash-income copy (new AND two pre-existing trade
FAQ keys) claimed the amount-first numpad, which has been EXPENSE-
ONLY since v0.5 — income copy now describes the real sale flow. Also
fixed: PT quoted a nonexistent button ("Não — está devendo" → "Não —
me deve"), home/faq keyword cannibalization, SERP-length
descriptions. KNOWN LIMIT, unchanged: the prerender is English —
ES/PT copy hydrates client-side on the same URLs, so Spanish and
Portuguese queries can't rank separately without path-based locales
(a real i18n-routing project, deliberately not started).

GA4 events (2026-08-24): analytics.tsx exports trackEvent — no-op
without an ID, off /app, silent under Do Not Track, never carries
personal data. Three events wired: founding_signup (the ONE
conversion; fires on form success, never the email), open_app_click
(beacon transport — full-page nav), language_switch ({language}).
Wiring proven locally with a throwaway ID: dataLayer showed js →
config → event language_switch {language:"es"} on a real ES click
(temp ID removed from .env.local after). DEPLOY.md has the 5-minute
GA connection steps + the full event table; still dark in prod until
NEXT_PUBLIC_GA_MEASUREMENT_ID is set. founding_signup should be
marked a key event in GA4 Admin once it first fires.

Desktop site (2026-08-23): the marketing pages gained real desktop
layouts — additive lg: classes ONLY, mobile markup untouched. At lg
the frame widens to max-w-5xl (the app's own desktop width) and
sections go two-column (text beside the real-component demo — the
same grammar as the app's desktop rail): landing hero beside the
sheet with the CTA under the words, the three steps and the Owed
section as text|screen pairs, tax+trust side by side; pricing is a
2×2 (free-forever | founding CTA / future modules | the rule we
charge by); trade pages pair pains|does with the demo centered
below and a two-column FAQ; about pairs beliefs|what-it-is-not;
/faq flows its 11 answers in two columns. The header nav sits
inline in the header row at lg (two nav elements, only one ever
displayed). Running text holds max-w-3xl. Reading pages (help,
privacy, terms) deliberately stay at 40rem. Browser-verified at
1280 (/, /pricing, /for/cleaners, /how-it-works, /about, /contact,
/faq) and regression-checked at 390 — mobile unchanged, zero
console errors. design-tokens.md records the desktop frame rule.

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
A 48-agent adversarial pass over the diff confirmed and FIXED: the
demo account was deletable SERVER-SIDE (the guard was JSX-only —
now blocked in the RLS insert policy and the purge function, by the
tester-email convention); the purge date shown was a UTC slice that
the cron could beat by a local day (now a local date); the
deletion-request upsert needed the UPDATE policy 0013 didn't grant;
a failed profile load seeded blank fields whose Save would wipe the
stored profile (loads now throw, Save gates on a successful load,
and opening Settings re-checks both async facts); cancel left an
armed confirm form; the backup line couldn't see save failures; the
anonymous business form claimed "saved to your account". Known
accepted gaps: a REAL user whose email local part is "tester" is
treated as the demo account (the convention's cost); dismissal
markers are per-device, not per-account; the tax CSV's business
header rows are a preamble some rigid parsers dislike (preparers
are the audience).

Notifications SPIKE (dark, 2026-08-15 — NOT a milestone): the Alerts
module's plumbing, built against Meta's free test number and Twilio,
with ZERO production sends — WHATSAPP_ENABLED and SMS_ENABLED are
false/absent in prod and every sender no-ops to {skipped}. One
pipeline, no forked logic: three event types (owed_aging,
payment_matched, monthly_recap) → queue (0014) → the user's ONE
active channel picked at send time (0015: whatsapp | sms | off,
default off). Consent is per channel, timestamped, default OFF;
inbound STOP (both webhooks, shared vocabulary incl. PARAR/ALTO)
sets opted_out and wins until an explicit re-tick. HARD RULES kept:
official APIs only (plain fetch, no SDKs, no new deps); max 1
owed_alert per client per week (lib/notify/cap.ts); minimal data in
messages (first names + amounts, never memos). Template drafts for
Meta submission live in templates/whatsapp/ (3 events × EN/ES/PT,
UTILITY category, unsubmitted). Webhook writes need
SUPABASE_SERVICE_ROLE_KEY server-side; without it they verify,
parse and log only. Nothing TRIGGERS sends yet — no server clock
exists; wiring events to the queue is the module's un-darkening
work, not the spike's.

A2P 10DLC: registration is REQUIRED before production SMS — start
when the entity/EIN exists; sole-prop registration is acceptable at
founding-cohort scale. Until then SMS stays dark regardless of env.

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
  Public surface = the company website (landing, how it works,
  pricing, /for/{cleaners,landscapers,barbers}, about, contact, FAQ)
  + help + legal, all on the main app; doubles as the app-store
  support URL at v0.7.
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
