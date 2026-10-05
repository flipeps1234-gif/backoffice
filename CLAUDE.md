@AGENTS.md

# CLAUDE.md — read this before doing anything

## Sitewide find-and-fix — 2026-10-04 (owner: "3 clean passes as always. whole sitewide. focus on usability and security bugs. different lens on each pass")

A pass is clean when nothing survives verification that needs a change
under src/ or supabase/; any landed fix resets the count.
SIGNED-IN LOCAL TESTING NOW EXISTS: `scripts/mock-supabase.mjs` (its
header has the three steps) — an in-memory REST/auth stand-in on
127.0.0.1:3999 with an "offline" and a "refuse the next write" switch.
It is not Postgres (no RLS, no constraints), so it proves the CLIENT's
behaviour, not the database's.
PASS 1 — NOT CLEAN (count 0). Tooling: tsc/eslint/tests clean; npm audit's
next/og advisory re-rejected (opengraph-image.tsx is still the only
ImageResponse and is prerendered); a crawl of the live site (26 pages,
every internal link) found nothing but Cloudflare's own
/cdn-cgi/l/email-protection, which works in a browser; security headers
present on every route. Three lenses never run on this tree, each
finding verified before fixing (harnesses in the session scratchpad;
the permanent ones are the new tests):
- INJECTION / OUTPUT ENCODING — 3 findings, all at a cross-boundary sink.
  MED: admin_overview() (0023) cast every account's sales.line_items
  inside one SECURITY DEFINER statement — one sale with a non-array or a
  string/NaN/1e30 cents raised for everybody (/app/admin "dark", with the
  NOT-CONFIGURED note), and a negative unitCents silently cancelled other
  accounts' open sales. Migration 0025 (APPLIED, see DEPLOY.md) totals
  only well-formed lines and clamps lang; the route now tags a failed
  query (`reason: "query"`) so the screen says the query failed. MED:
  `languageLabel` used an account-chosen string as an object-literal key —
  user_metadata.lang = "__proto__" rendered Object.prototype and crashed
  the page; now a Map. LOW: csv.ts neutralised a formula only at the
  START of a field; Excel under a ";" list separator (pt-BR, es-ES) and
  LibreOffice's import dialog start a new cell at ";" or TAB, where a
  quote that does not open the field is literal — `Ana;=cmd…` was a live
  cell. TAB becomes a space, the apostrophe also goes after every ";",
  and ";" forces quoting. /api/founding refuses an address starting with
  = + - (the list is read by a person, possibly in a spreadsheet).
  Traced and safe: return-to (allow-list), JSON-LD, every href/src,
  PostgREST filters (no .or/.filter/ilike from input), every SECURITY
  DEFINER search_path, webhooks, headers, the extraction validator.
- NEWCODE over today's three commits — nothing above LOW. Fixed: /demoo
  History hid the "personal" marker (the breakpoint strip left a `hidden`
  with no un-hide) and accepted dates outside the one month its model
  holds; the camera input was `lg:hidden`, so a landscape tablet lost it
  when /app began serving the sidebar layout there (now
  `lg:pointer-fine:hidden`); DesktopGate — /app's front door on a wide
  screen — had no <main> and no <h1>.
- TASK-FLOW DEAD ENDS — 2 HIGH, 3 MED, all reproduced or read line by
  line. HIGH: A FAILED SAVE WAS NEVER RETRIED. persist ran each write
  once; offline, the entry stayed on screen under "check your connection
  / stay on this page", nothing was ever re-sent, and it was gone on the
  next open. The queue now RETRIES a save that never reached the server
  (lib/save-retry.ts: the browsers' fetch-failure messages and
  AuthRetryableFetchError) until it lands — strictly in order, later
  saves waiting behind it, on `online`, on the tab coming forward, on a
  2/5/15/30 s backoff and on the banner's "Try now" — and still reports
  and drops a save the server ANSWERED and refused. Every insert carries
  a client-made id, so a repeat cannot double a row; a multi-step work
  that half-landed fails for good on its retry, exactly as it did before.
  persist() now resolves at the save's FIRST outcome (readFiles awaits it
  holding the upload lock); signOut asks before abandoning a parked save
  and stops the retries; an unmount with a parked save raises the sticky
  banner on the next mount; `beforeunload` asks while a save is parked.
  The final-failure copy no longer says "check your connection": it says
  to reload and re-enter. HIGH: the sale's "how many hours / sq ft"
  field was a NUMBER bound to a text input — "1." parsed to 1 and React
  wrote "1" back, so 1.5 hours became 15 ($600 for a $60 lesson), and
  clearing the "1" unmounted the field mid-typing. Text is now kept per
  service while typing (the clients page's qtyText rule). MED: both
  upload inputs kept their selection, so re-picking the same screenshots
  after a failed upload fired no `change` — "try again" did nothing. MED:
  an expired or already-used sign-in link came back as #error=…, was
  forwarded to /app and then ignored — a blank form; the sign-in screen
  now says so (signin.linkExpired / returnFailed, EN/ES/PT) and strips
  the params. MED: renaming a client to a name another client has was
  rejected by the database, shown as saved, bannered as a CONNECTION
  problem and reverted on reload with the notes typed beside it; refused
  in the form now (clients.duplicate). Also: the phone's Owed → "Find the
  payment…" answered inside the main loop the Owed takeover was covering
  (it closes the takeover and scrolls to the answer); a nameless owes-me
  sale read "Saved —  owes $80.00."; "Saved — Rosa owes $60.00." stayed
  up after Rosa's cash was taken; the help article said "You can try
  everything without [an account]" (production requires sign-in); the
  product chart's callout no longer covers other months' dots.
Checked SIGNED IN against the mock (a first for the sidebar layout):
boot, a 1.5-hour owes-me sale, Got cash (mirror row + sale paid +
dashboard), duplicate-name refusal, offline → parked → `online`/"Try
now" → landed in order, a refused write (reported once, queue moves on),
sign-out confirm, the beforeunload guard, the phone layout's banner.
NOT checked: anything against the real project signed in; a real
spreadsheet opening the CSV (the reader in tests/unit/csv.test.mjs
emulates the documented delimiter rules); Android's file picker; the
native app, whose messages.json is generated from these strings — the
reworded save-failure copy says "reload the page", so read it before
regenerating. Queued for pass 2: tap targets under 44px on the phone
(Settings link 20px, "Not a payment" 16px, Got cash / Log again 30px —
design-tokens.md says 44).

## Phone demo at /demoo — 2026-10-04

Owner: "turn it into an interactive demo and put it at /demoo" — look B
on the "Contado Mobile Redesign" canvas. /demoo (TWO o's; /demooo with
three is the real sidebar app) is a SAMPLE-DATA preview of a proposed
phone layout: slim black banner, the desktop home's number and month
chart, Upload (green) / Log sale / Log expense, "Total Owed to You", and
the desktop sidebar as a slide-in menu. It reads no account and saves
nothing — src/app/demoo/ is self-contained (its own data.ts, ui.tsx and
screens, restored from the sample desktop demo of commit 240c347 with
their breakpoint classes stripped so it stays phone-shaped on a laptop,
where it sits as one 430px column). English only, always light. Its
chart is a COPY of desktop-overview.tsx's compact Chart, not an import,
so the preview shares no code with the product; it places the callout
below the line when it would cover other months' dots (the product's
compact chart still covers them when the running month is the low one).
Unlisted: noindex, not in the sitemap. Checked in a browser at 390 and
1280: every menu section, chart toggle and month tap, checking a
payment, a cash sale, an owed sale with a new client, an expense, paid
cash on Owed, client list/detail/back, Escape and focus on the menu; no
console errors, no sideways scroll.

## Desktop app on /app — 2026-10-04

Owner: "ok push to main now" (after "ship" put the preview live at
/demooo on 2026-10-04). /app now renders `app-frame.tsx`: a window at
least lg (64rem) wide when the page opens gets
`<UploadScreen layout="desktop" />`, anything narrower gets the phone app
in its old header (moved out of app/page.tsx). The choice is made ONCE
per visit and held — never switched live under a mounted Ledger (a
half-typed sale, a takeover, a queued write) and never by remounting it;
both layouts already work at the other size, and leaving /app forgets
the choice. Before the window can be read (server render + hydration)
both frames' loading line are rendered and CSS (`lg:hidden` /
`hidden lg:block`) picks, so neither size paints the other's frame.
UploadScreen gained `returnTo` (default /app; /demooo passes its own) —
the layout no longer says which page a sign-in started on. /demooo stays:
the sidebar app at any width. The classic layout's lg side column
(useIsDesktop in upload-screen.tsx) is now reached only by a phone-width
window widened mid-visit. Checked in a browser, anonymous mode: opens at
1280 and 1024 → sidebar app; 1023 and 375 → phone app; opened wide then
narrowed → stays sidebar (folded, no sideways scroll); every sidebar
section opens; no console or hydration errors. NOT checked: anything
signed in (same gap as the section below), and a real resize event —
the browser harness's viewport override fires no matchMedia change.
ROLLBACK: revert this one commit; /app goes back to the phone app at
every width and /demooo is unaffected.

## Desktop app (preview) — 2026-09-27, branch feat/desktop-app

Owner: "take it from being a demo to the new full product … keep it in
the demooo", on a PRIVATE PREVIEW (Vercel preview of this branch, behind
Vercel Authentication) — main and getcontado.com untouched until the
owner says ship. /demooo is now `<UploadScreen layout="desktop" />`: the
SAME Ledger, state and write paths as /app (queue, settlement races,
generation readback — none of it duplicated), framed by
`desktop-shell.tsx` (black sidebar in the owner's order: Dashboard, Log
sale, Log expense, Owed, Clients, Products and services, History; Upload
screenshots on top, Settings/language/account at the bottom; below lg it
folds into a sideways-scrolling top bar) and `DesktopGate` for terms,
sign-in, loading and the tour. The home is `desktop-overview.tsx`
(kept/in/out, one large month chart with a year and series switch,
revenue by service) over pure `src/lib/desktop.ts` (IN = business
money-in + EXPECTED sales, the RunningTotals figure; tests in
tests/unit/desktop.test.mjs), with the app's own Dashboard below it as
"Reports and exports" (Dashboard gained an optional `title`). The nine
takeover screens are now element constants shared by both layouts; the
classic render is unchanged. Desktop rule: sale, expense, products and
settings stay MOUNTED while hidden once opened, so the sidebar never
vaporizes a half-typed entry — hence `entryOpen` (search / "log again"
guards) no longer counts Products/Settings on desktop. Sign-in return:
`src/lib/return-to.ts` — the sign-in screen records /app or /demooo
(allow-list, 1 h, consumed once) and the landing's #access_token forward
goes there. Copy: `src/lib/messages/desktop.ts` (EN/ES/PT). Preview env:
NEXT_PUBLIC_SUPABASE_URL/ANON_KEY scoped to this branch; OWNER-SIDE for
the preview to be fully real: add the preview origin to Supabase Auth →
Redirect URLs, and (only if screenshot reading is wanted there)
OPENAI_API_KEY + SUPABASE_SERVICE_ROLE_KEY for Preview.
FIND-AND-FIX PASS 1 on this branch (four never-run-here lenses: newcode
over the upload-screen refactor, state-machine over the sections, product
semantics over the new numbers, authz/copy/a11y): the /app refactor came
back byte-equivalent (mainLoop re-inlined and diffed). 11 findings, all
fixed: HIGH — GA armed inside the signed-in /demooo (analytics.tsx's
deny-list only named /app, /api; now PRIVATE_PREFIXES includes /demooo,
and GA is never armed on a URL carrying a sign-in return's tokens);
HIGH — a mere visit to Log sale/expense opened an empty form and the
global guard then blocked every "Log again" and search (sections now open
on a start panel; desktop guards are per form kind and take the owner to
the open form with desktop.saleOpen/expenseOpen; search never blocks);
MED-HIGH — a tour review unmounted mounted-hidden forms (a desktop review
now renders inside the frame; closes to the dashboard); MED — return path
recorded on sign-in MOUNT (now at send/Google start, SignIn returnTo
prop), and read-and-forget twice under StrictMode (once per load); MED —
chart IN included EXPECTED sales while the Reports card beside it didn't
(series is transactions-only; expected shown as "paid, waiting to
match"), service bars vs chart months disagreed for rows dated ahead
(seriesMonths), service card unscoped (now "…, {year}"); LOW — all-time
owed on past-year tabs, empty-state copy vs pending/owed, chart names
without values for screen readers, badge without words or on phones.
PASS 2 (newcode over pass 1's own diff): 4 findings, all fixed — MED:
the in-frame tour left the sidebar live (Settings could mount seeded
from the old profile mid-tour and revert it on Save) → DesktopShell
`locked` makes the section links inert and navigate() refuses while the
tour is up; the tour card carries the account line on phones. MED-LOW:
the hidden QuickAdd's window keydown still typed into the parked amount
→ QuickAdd `active` (false unless its section is showing). LOW: a year
with only EXPECTED sales said "log a sale" (desktop.emptyExpected; the
generic empty copy now says cash sale/expense); a row dated ahead stole
the chart's opening month and the "so far" label (partialIndex, home
month = today's).
PASS 3 (newcode over pass 2 + RESILIENCE, never run on this layout):
6 findings, all fixed — MED: after a failed ledger LOAD the desktop home
drew a confident $0.00 year (DesktopOverview now takes `loadFailed` and
shows the load error instead; a tour review no longer clears that
error); MED-LOW: the save-failed banner sat at the top of one long
scrolling page, off-screen under a long Owed list (now sticky on
desktop); LOW-MED: Clients unmounted on a sidebar click, losing
half-typed client notes/recurring edits (now mounted-hidden like the
forms; a fresh open still shows the list); LOW: a Products EditForm kept
stale fields while the tour edited the same service (EditForm keyed on
the row's content); LOW: empty copy said "no money" when only personal
money existed ("no business money"); LOW: the chart callout overflowed
for five-figure ES/PT amounts (236px, clamped inside the plot).
Severity trend: P1 11 (2 HIGH) → P2 4 (2 MED) → P3 6 (1 MED, rest
lower) — P3's MEDIUM came from a NEW lens, not a regression.
PASS 4 (newcode over pass 3): 4 findings, none above MED-LOW, all
fixed — pickSaleAgain and Settings' "Open clients" still unmounted or
refocused a mounted-hidden Clients page (both now desktop-aware: only
/app closes/refocuses it); the sticky save banner covered the sort
stage's sticky RunningTotals (not sticky on Upload); the overview card
repeated the load error under the banner (now desktop.loadWaiting).
LOOP STOPPED after pass 4 by the skill's stop conditions: no open
CRITICAL/HIGH/MEDIUM, every finding fixed with browser or harness
evidence, severity falling (P1 2 HIGH → P2 2 MED → P3 1 MED from a new
lens → P4 MED-LOW/LOW, all follow-ups of the mounted-hidden design).
Lenses run on this branch: newcode ×4, state-machine, product
semantics, authz/exposure, copy-vs-behavior, a11y, resilience. NEVER
run here: concurrency (two devices), privacy/data lifecycle,
performance/bundle measurement, schema-drift — none touched by this
branch (same Ledger, same writes), which is why they were not spent.
PASS 5 (2026-10-04, owner re-ran find-and-fix "on the demo"; lenses
never run here: PARITY matrix classic-vs-desktop, CONCURRENCY/stale
state of the mounted-hidden forms, performance/bundle and deploy-headers
by tooling, a width x theme x language browser sweep). Tooling: the new
next advisory GHSA-vcvr-r3jv-pc5j (RCE in next/og ImageResponse,
16.2.0-16.3.5, CVSS 9.5) REJECTED with evidence — it needs
attacker-controlled values in ImageResponse SVG/styles; the one use
(opengraph-image.tsx) is static and prerendered (x-vercel-cache HIT).
The 16.3.6+ bump stays an owner decision, as before. Bundle: /demooo ==
/app (283 KB br, same chunks), landing 207 KB br, supabase-js still
absent from "/". Headers/noindex/sitemap identical to /app. Fixed
(13): MED — the confirm-stage gate was "don't render the hub", so on
desktop (and /app's lg rail) a sale could link a payment still on the
confirmation sheet; the row left `pending`, confirmBatch never saved its
sheet edits, and it reverted on reload while the sale read paid. The
rule now lives in the data path: `matchable` (unchecked rows are not
candidates while stage is "confirm") at handleSaleDone and both Find
payment handlers; the sale waits EXPECTED and confirmBatch links it.
MED — NewSale carried the client as a NAME: renamed in Clients while
the form waited, finish() minted a duplicate under the old name
(`pickedClientId`). MED — sale and expense forms copied the clock at
mount; parked for a day they logged on the day they were opened (date
is now null = follow the clock, read again at save; a picked date is
kept). LOW — a rate quantity re-priced as flat after a pricing-type
edit (1200 sq ft x $200): quantities remember their kind, a mismatched
line is dropped and an emptied sale returns to the products step, never
a $0.00 "Paid?". Parity: RunningTotals was never rendered on desktop
(now in Upload, shared element); no camera input on phones (shared
snapEl, lg:hidden in Upload); Settings re-checks ran only on first
mount (every visit now) and its Products/Clients rows unmounted it;
Find payment answered off-screen (scrolls to top); undoing a match
while stage was "upload" stranded a to-sort row (stage returns to
"sort"); tour/Settings/sale copy named the classic "home screen"
(desktop.* variants via a `desktop` prop on NewSale, SettingsPage,
SetupWizard). Phones: chart labels rendered ~4px (compact 360-wide
drawing under 640px, narrow month names), cards p-4. CORRECTION to pass
4: its "banner would cover RunningTotals on Upload" premise was false
when written (RunningTotals was not on desktop at all — a reviewer
claim I did not verify); the non-sticky-on-Upload rule is correct only
as of this pass. OBSERVED, not fixed (pre-existing in /app, unchanged
file): ProductCard's picker is a <button> containing the stepper
<button>s (React warns: nested buttons); a sale notice keeps the
language it was written in after the picker moves.
PASS 5 REVIEW (two newcode agents over f5b3566, then fixed): MED — the
`matchable` filter made Owed's "Find the payment…" answer "no payment
matches" while the match sat unchecked on the sheet, beside "It was
cash" (a second money row): one shared `findPaymentFor` (both OwedTabs;
the two inline copies had drifted) now says N possible payments are
waiting to be checked (home.matchWaiting.*) and, on desktop, opens
Upload; a digital checkout in the same state says it will match once
the check is finished (home.markedPaidAfterCheck). LOW — a "log again"
line whose service changed kind showed quantity 0 while still charged
(snapshot lines are exempt from the kind guard, as they are from the
catalog); desktop.backupIssue pointed at a banner that may be gone;
RunningTotals was wrapped in a div its own height, which defeats its
sticky (now a direct child of the Upload card); the compact chart's
callout covered the active dot mid-year (drops below the point). Lint
caught one of my own edits (a helper closing over `prefillLines` above
its declaration — React Compiler rule), fixed by ordering. Final small
diff self-reviewed and browser-verified. Lenses run on this branch now:
newcode x6, state-machine, product semantics, authz/exposure, copy,
a11y, resilience, parity, concurrency/stale-state, bundle, headers,
visual sweep. Never run: privacy/data lifecycle, capacity, schema-drift
(no surface in this branch), and anything SIGNED IN against the real
backend — every browser check so far ran in anonymous mode with the
mock extractor.

## Marketing site surface — 2026-09-14

Owner-approved from a mockup (Option B in both themes): every public page
is a GREY page (`#e5e5e5` light, `#171717` dark) under a full-width BLACK
top banner holding the brand, nav, language picker and "Open the app".
The banner is the existing `<header data-site-header>` in public-shell.tsx
painting itself full-bleed (black 100vmax box-shadow clipped at its bottom
edge — no 100vw overflow); globals.css switches `--background` on pages
that contain it via `:has([data-site-header])`, so `/app` is untouched.
design-tokens.md records the exception. Shipped from main on its own
(the fix/security-review-2026-09-04 batch and its unapplied 0024 stayed
out).

## Welcome tour — 2026-09-10, reshaped 2026-09-11

A four-step setup wizard (src/app/setup-wizard.tsx; copy in
src/lib/messages/setup.ts, `setup.*`, EN/ES/PT) shown ONCE per account,
after sign-in and before the hub. 2026-09-11 (owner): THE BUSINESS
PROFILE COMES FIRST — the moment an account exists it is asked for its
business, with "Not now" (setup.notNow) as the way out; the welcome
screen was dropped (SETUP_STEPS = business, services, try, done). The
business step's Continue WRITES THE ROW RIGHT THEN (hub
`saveSetupProfile` → `writeSetupProfile`, the same create-if-absent /
upsert split endSetup uses) and advances only once the write landed, so
a reload after it lands in the hub with the fields kept; Finish then
has nothing to write and just ends the tour (endSetup's no-op branch
sets the decision to skip). "Not now" ends the tour like Skip: the row
is created, blank or with whatever was typed, so the question is asked
once. The sign-in gate was centered the same day (sign-in.tsx: one
`max-w-sm` column, `text-center`, both screens). THE RULE is pure and unit-tested
(src/lib/setup.ts, tests/unit/setup.test.mjs): `needsSetup` =
no business_profiles row AND zero transactions AND zero sales — all
three LOADED facts, never assumed (a failed loadProfile still throws
and is never read as "no row"). THE DECISION IS LATCHED AT BOOT
(review fix, same day): a signed-in Ledger shows the boot "Loading"
line — not the hub — until the decision lands, decided ONCE from the
server row counts and latched (`setupDecision` pending → show | skip,
every write through an updater that only replaces "pending"). Second
review fix: the decision SHORT-CIRCUITS — the first fact that rules
the tour out (a profile row, any transaction, any sale) decides
"skip" the moment it lands, so an existing account is never held
behind the slowest load (transactions page in 1000 a call); only the
all-empty case waits for all three; any of the three failing resolves
to skip; and a 15 s timer (SETUP_DECISION_TIMEOUT_MS) resolves a
stalled request to skip so "Loading" can never hide the hub — or
Sign out — forever. Nothing that empties the in-memory ledger later
can re-summon the tour. A new account therefore meets the tour first, never hub → tour
→ hub. Anonymous mode never decides (no account). THE ROW'S MEANING:
the tour writes the business_profiles row on the business step's
Continue or on Not now / Skip (blank fields included; Finish normally
has nothing left to write) — the row's existence IS "tour done",
cross-device, no per-device marker, no migration (src/lib/profile.ts;
`loadProfile` now returns `null` for no row, and the hub maps
null→EMPTY_PROFILE for the form while tracking `profileExists`
separately). The FIRST-USE write is `insertProfileIfAbsent` (ON
CONFLICT DO NOTHING on account_id) followed by a readback — two
devices can both be in the tour on one new account, and the second to
finish must never blank the first one's fields; review mode and the
Settings business save keep the plain upsert (the row exists, the
fields changed). REVIEW FIX 2026-09-11 (second write): Continue
resolves with the row that ACTUALLY landed (`saveSetupProfile` →
`writeSetupProfile` → `BusinessProfile | null`) and the wizard
reseeds its three fields from it — two devices in the tour on one new
account, the other one's create won, this device's later Finish/Skip
would otherwise upsert its stale blank draft over the real fields;
reseeded, draft() equals the stored row, the exit hits the no-op, and
first use makes exactly one create-if-absent write. Continue's no-op
is the SAME rule as Finish/Close (`setupHasNothingToWrite`: unchanged
AND (row exists OR review)), so a review's Continue never creates a
blank row either. Steps: business (the three profile fields, same
trimming/uppercasing as Settings; Continue writes the row right then
via saveSetupProfile and advances only once it landed, Enter in any
field is Continue, only the pressed button reads "Saving…", a failed
Continue refocuses the button; "Not now" ends the tour like Skip),
services (the Products page's EditForm, now a named export, saving
through the hub's ONE `createService` handler — services are real rows
the moment they're saved, on purpose; each card is tap-to-edit through
the hub's ONE `updateService` handler, so a typo or a 12.00-for-120.00
is fixed where it was typed; the form autofocuses its name field and
closing it refocuses the step heading, so focus never drops to
<body>; the pricing chips and the tour's Sign out are min-h-11), try (the landing page's
SwipePlayground on fixture rows, captioned as practice, nothing
persisted; the playground takes the tour's own caption and "Start
over" wording so one caption, not two, frames the deck), done (the
hub's three ways to log money, worded as the hub's tap-to-pick box).
Wiring: the wizard REPLACES the hub (both columns, no rail) but keeps
the email + Sign out line above it, so a wrong-address sign-in can
leave without Finish/Skip stamping that account "done"; the brand
click scrolls to top and does not close it; the profile write is a
direct await, not the persist queue — on failure the TOUR'S OWN alert
(setup.saveFailed, cleared on every attempt and on success — the hub's
shared `status` is reset only by the upload flow and would carry a
stale alert into the hub or into a review) shows, the wizard stays on
its step with the fields typed, and Finish/Skip retry. The hub's
lost-write banner (`status === "error"`) renders in the tour branch
TOO: a service saved on step 3 goes through the persist queue, whose
failures report there, and the hub return is not reached while the
tour is up — without it an offline Save showed a card under copy
that says it is saved. Opening a review clears a transient
`status`/`error` (never a sticky `saveFailed`) so an unrelated
earlier failure does not paint over it. While a service
form is open on the services step, Back/Continue/Skip are hidden —
its own Save/Cancel are the exits, as on Products, so a half-typed
service is never silently dropped. The step count is spoken: it rides
as sr-only text inside the focused step heading (an aria-label on an
aria-hidden dot row was never reached). RE-ENTRY: Settings → Help &
about → "Show the welcome tour" (settings.showTour; the
settings.profileLoading hint shows while the row is gated) reopens the
same screens prefilled with the exit link labelled "Close"
(setup.close) instead of "Skip for now" and the header reading
setup.headerReview instead of "Welcome"; Finish/Close writes the
profile only if a field changed — the no-op is about the MODE
(`tourOpen`), not the row, so an account with ledger rows but no
profile row (never touched Settings) can Close without creating a
blank row the copy denies; the row is gated on profileReady like
the business Save (a tour seeded from an unloaded profile could
overwrite a real row). FLOW.md's gate order is
now terms → sign-in → welcome tour when needsSetup → hub. NATIVE
PARITY: not yet — the native lane mirrors setup.ts names (needsSetup,
SETUP_STEPS), a nil-returning loadProfile, profileExists on AppStore,
SetupWizardView between sign-in and HomeView, and the Settings row;
messages.json regenerated from this commit carries the setup.* keys.

## Demo login REMOVED 2026-09-08

The shared "tester" login is gone from the web code: `/api/demo-session`
is deleted, the sign-in screen no longer recognizes a demo word (magic
link + Google only), `isDemoAccount`, `DEMO_EMAIL`/`DEMO_PASSWORD`/
`DEMO_WORD`/`DEMO_EXTRACTION` and every demo branch (extract mock
opt-in, admin exclusion and checkbox, local-scope sign-out, banner,
"can't be deleted" line, terms block, FAQ, help article) are removed,
with their message keys in all three languages. Why: one public account
shared by every visitor was the App Store readiness audit's top finding
(a reviewer path that broke, a spend surface, and terms that had to
disclose it); the landing playground (real components, nothing saved) is
the try-before-you-sign-in surface now, and App Review gets Sign in with
Apple on native. The DATABASE keeps its objects untouched for now —
`tester_lock`, `protect_tester_identity`, `enforce_demo_cap`,
`reset_demo_rows`, the `demo_images_daily` limit, `admin_overview`'s
tester flag and the tester auth user — until a later migration retires
them; migrations 0001–0023 are history and are never edited. Every demo
mention below this section is a dated record of how things were.

## Security follow-up 2026-09-04 — DEPLOYED to production 2026-09-04 19:14–19:30 CDT

Branch `fix/security-review-2026-09-04` fixes the review's remaining gaps.
0021 repairs the demo transition-table photo guard (normal transactions
raised 42703), bounds every previously omitted writable text/JSON field,
and stamps deletion requests at the database while ignoring timestamp edits.
The owning account retains UPDATE for existing native merge-upserts; web
ignore-upserts and native first/repeated requests are both regression-tested.
0022 adds atomic account/demo/project image quotas and concurrency leases,
and a server-only signup RPC with shared per-IP/global limits. Both routes
use SUPABASE_SERVICE_ROLE_KEY only through a `server-only` module and fail
closed if protection is unavailable. Real demo extraction remains enabled
by default, as the Obsidian notes intended, with a 10-image daily allowance.
No notification settings, seeded demo records or existing deletion requests
were changed. While preparing, no production credential was read or used.

Next/eslint-config-next moved together to 16.3.4 (the earlier audit's
deferred dependency upgrade is now included in the owner's “fix” request).
The provider has an 8192-token completion cap and rejects length-truncated
output. The security counters' retention and anonymization are disclosed
in EN/ES/PT. `npm run test:security` runs isolated PostgreSQL migrations and
stubbed real-route regressions; no API keys are required. DEPLOY.md records
the exact pending production rollout, preflight/verification SQL, quotas,
and the temporary founding-signup outage during the migration/deploy window.
ROLLED OUT 2026-09-04 (owner's explicit written authorization; DEPLOY.md
top section has the full evidence): preflight clean; a NEW Supabase secret
API key `vercel_production_server` set as SUPABASE_SERVICE_ROLE_KEY in
Vercel Production only (Sensitive, moved by clipboard, never displayed;
revocable on its own — the legacy service_role JWT was not used); 0021 and
0022 applied via the MCP (`20260905001435`, `20260905001625`) and verified
(public grants false, service_role true, five constraints validated, three
cron jobs active, limits at defaults); `main` fast-forwarded to 52117c4 and
READY as dpl_GohsSuFf4PUMqYibWJYSGeMotPje on getcontado.com (founding form
closed ~3 minutes between 0022 and READY); smoke-tested live — demo session,
a synthetic 1-cent cash row (inserted, read, deleted), one blank-PNG
extraction through the real provider (200, one `extraction_usage` row kept
as real spend, lease closed), two synthetic founding signups (ok twice,
rows removed), unsigned webhooks 503, anonymous extract 401. High-water mark
0022. Still owner-side: the OpenAI project spending cap stays the money
ceiling; tune `security_limits` in the SQL editor if the demo's 10 images/day
or the 200/day project cap prove wrong.

## Landing playground + savings calculator 2026-09-06

Owner: "make the landing page interactive with the fields being fill out
able … write in a slider for monthly money and time saved, with hourly
rate, weekly time spent on accounting". This REVERSES, on the owner's
call, the inert-only rule DemoFrame was built for after the 2026-08-26
iPhone incident: the hero sheet, the swipe stage and the Owed tab are now
real, usable components in a TryFrame (same card, no inert, no cover)
captioned "Try it — nothing is saved" with a reset link once touched
(landing-playground.tsx; state is page-local, nothing persists). The
drop zone, Insights and the totals/Dashboard demos stay inert — nothing
honest for them to do without an account. Sheet: every field editable,
rows removable, totals recompute. Deck: Business/Personal decide, undo
restores, empty state reachable. Owed: "Got cash" settles (open →
paid/cash), "actually unpaid" reopens. The calculator
(savings-calculator.tsx, math in src/lib/savings.ts, tests/unit) takes
hourly rate ($10–150) and weekly bookkeeping hours (0.5–12) and shows
hours back per month and their worth at that rate, on ONE stated
assumption printed beside it: about 15 minutes a week with contado
(CONTADO_MINUTES_PER_WEEK). The note says it is an estimate of the
visitor's time, not money contado pays. `npm test` now runs
tests/security and tests/unit.

## Google sign-in 2026-09-06 — code live, provider off until the owner enables it

"Continue with Google" on the sign-in gate (sign-in.tsx): rendered only
when GoTrue's public /auth/v1/settings says `external.google` is true
(one cached GET; false or unreachable = no button — copy matches
behavior), `signInWithOAuth` with `redirectTo` = the bare origin and
`prompt=select_account`; the landing already forwards `#access_token` /
`#error` to /app and now also `?code=` / `?error=` in case the client's
flow ever becomes PKCE (supabase-js's default is implicit, verified in
node_modules). Failure to start the handoff shows signin.googleFailed
(EN/ES/PT). Privacy processors paragraph discloses the Google exchange.
Metadata rule amended: `user_metadata.lang` is the only key WE write;
Google adds full_name/avatar_url/picture/email, unread by the app.
OWNER-SIDE (DEPLOY.md): Google Cloud OAuth client + consent screen, then
Supabase → Auth → Providers → Google; the button appears by itself.
Native SignInView: no Google yet (parity item). "Dispatch" check the same
day: nothing in the repo is named dispatch; the notification pipeline is
still dark (senders no-op, no cron, no WHATSAPP_/SMS_/TWILIO_ env in
Vercel; the only Vercel cron is /api/health at 12:00 UTC).

## Owner analytics 2026-09-05 — /app/admin

Owner-asked ("an analytics page where I can have a view of what's going
on with my clients … total money logged, account lists"): the owner's
cross-account view lives at /app/admin — headline tiles (accounts, active
7/30 d, money in and out logged, owed = open sales, payments with the
screenshot/typed split, sales by state, uploads and images in 30 days),
12-week money and new-account sparklines, a 30-day images column chart,
reach facts (clients, active recurring, profiles, founding signups,
deletions pending), languages, storage against the 500 MB ceiling with
the biggest tables, and a sortable account list (email, joined, last
active, counts, money, deleting/profile/recurring chips). English only on
purpose — owner tooling behind `OWNER_EMAILS`, not a user surface, so it
stays out of the trilingual dictionary. Data path: `/api/admin/overview`
(token → 401, unconfigured → 503, non-owner → 403)
calls `public.admin_overview()` (migration 0023, SECURITY DEFINER,
service_role only, returns aggregates + per-account counts, never
memos/payers/names/notes/photos) through the server-only client. Pure
helpers and the typed parser are in `src/lib/admin/overview.ts`; the
screen is inline SVG in currentColor, palette per design-tokens.md.
Product laws inside the SQL: per-line rounding for sale totals, EXPECTED
counts as received so owed is OPEN only. Tests: `npm run test:security`
covers the function's grants and totals (PGlite) and the route's four
gates. `OWNER_EMAILS` = felipe@getcontado.com in Vercel Production since
2026-09-06 (owner's choice; verified live — non-owner 403, anonymous
401). Dev-only `?sample=1` renders a fake payload for layout work.

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
Typecheck, lint and `next build` pass clean. At the time, ZERO automated
tests (no runner, no test script; since 2026-09-04 `npm run test:security`
runs 22 isolated regression tests, and branch `overnight/engine-tests`
holds a 455-test Vitest suite for src/lib) — the pure logic old and new is
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
  see the app's own sign-in gate (which IS the front door), not a
  redirect to the landing; a redirect would
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
(temp ID removed from .env.local after). DEPLOY.md has the GA
connection notes + the full event table. LIVE since 2026-08-24: the
owner's property G-JEM7B09P0L is the committed default (measurement
IDs are public; env var still overrides, empty string disables).
founding_signup should be marked a key event in GA4 Admin once it
first fires.

Founding capture (2026-08-26): CONFIRMED BROKEN in production and
diagnosed — POST /api/founding returns 500 on the live site because
migration 0016 (founding_list) never ran there; a real form submit
shows the red error, no fake success, and founding_signup correctly
does not fire. The fix is owner-side: run 0016 in the Supabase SQL
editor (idempotent; also inside the combined 0001–0016 file). A
6-agent adversarial pass over the chain found the DB contract SOUND
(insert uses return=minimal so the deliberately-missing SELECT
policy is fine; 23505 duplicate-as-success is the code PostgREST
actually returns) and confirmed three form defects, all FIXED and
dev-browser-verified in EN + ES: the form lacked noValidate, so the
browser's native bubble (in the BROWSER'S language) preempted the
translated invalid message for common typos like "maria"; a
>320-char address passed the client and looped forever on the
generic retry copy (now client-capped, maxLength + check); a 429
rate-limit response told the user to "try again" — the inverted
advice (now a distinct amber landing.ctaSlow state, EN/ES/PT). The
route now logs error.code so the NEXT such outage is diagnosable
from Vercel logs at a glance (PGRST205 = table missing). RESOLVED
2026-08-26: the owner ran 0016 and the full loop verified live on
production — POST returns ok, a real form submit renders the green
"You're on the list." and founding_signup fires into the GA4
dataLayer. Two synthetic rows from the verification sit in
founding_list (founding-e2e-check@ / founding-browser-check@
example.com) — harmless, deletable in the Table Editor.

Find-and-fix pass (2026-08-27, seven NEVER-RUN lenses: newcode,
capacity/quotas, state-machine, concurrency, deploy-headers,
performance/bundle, persisted-state migration — newcode and migration
came back CLEAN, zero findings). 10 raw findings, 2 HIGH confirmed by
adversarial verifiers, 8 verified by the coordinator, 0 refuted. All
fixed this session:
- HIGH capacity: photos (~400KB base64 IN sale rows) were re-downloaded
  for the whole ledger on EVERY app open — a handful of photo-using
  users would exhaust the project's free-tier egress, and 500MB of DB
  is only ~1,200-1,500 photos project-wide. loadSales no longer selects
  photo; loadPhotoIds ships ids only; bytes load per client on demand
  (fetchClientPhotos ← ClientsPage onOpenClient); the everything-CSV
  photo column stays truthful via the id set. DEPLOY.md ceilings table
  rewritten (it claimed "thousands of rows away"). The bytes-in-rows
  design itself stands until a deliberate Supabase Storage move.
- HIGH concurrency: a STALE second device settling an already-settled
  sale minted a second linked payment row — permanent doubled revenue
  in totals and the tax CSV, invited by its own stale Owed tab. Every
  settlement write is now conditional at the database: settleSale
  updates only open/expected rows, claimTxnForSale links only unspent
  payments, paySaleCash's queue item rechecks DB truth (findLinkedTxn)
  and adopts the other device's payment instead of minting, losing
  racers roll back in-memory + remove their own residue. Migration
  0017 (unique index on transactions.matched_sale_id, NULLs distinct)
  makes it a hard guarantee — OWNER MUST RUN (combined file regenerated
  ~/Desktop/contado-combined-0001-0017.sql); code is correct both
  before (window narrowed to ms) and after (closed).
- Sign-out now drains the write queue first (queued writes ran
  unauthenticated after token revocation, failed RLS, vanished with
  the error banner unmounted).
- Initial loads MERGE by id instead of replacing state — an entry
  logged during a slow first load no longer vanishes (and no longer
  invites a permanent duplicate re-entry). All five stores.
- Desktop rail "Log again" (sales + history rows) now respects the
  finish-entry-first guard instead of vaporizing a half-typed
  sale/expense; openClientFromSearch also blocks over Products/
  Settings (unsaved forms) and closes Owed/RecentSales instead of
  latching a ghost ClientsPage behind them.
- Security headers: CSP frame-ancestors 'none' + X-Frame-Options DENY
  site-wide (next.config.ts headers()) — the app was frameable for
  clickjacking; nothing in the product frames itself.
- Landing no longer ships @supabase/supabase-js (60KB gz) to every
  anonymous visitor: the signed-in bounce probes localStorage for the
  sb-*-auth-token key and only then dynamically imports the client.
  Verified in the build: landing HTML has zero references to the SDK
  chunk; /app still has them (positive control).
- /api/demo-session surfaces Supabase's per-IP /token rate limit as an
  honest 429 "give it a minute" (~30 demo starts per 5 min site-wide
  trips it — Vercel's shared egress IPs) instead of a fake outage 502.
- Step-0 tooling: nanoid bumped to 3.3.18 (in-range advisory fix);
  postcss + sharp HIGH advisories REJECTED with path evidence (build-
  time own-CSS only; no next/image usage so the optimizer never sees
  attacker bytes) — the real fix for both is the next@16.3.3 upgrade,
  deliberately an owner decision, not an audit side effect.
DEFERRED with evidence (LOW, documented): the monolithic i18n MESSAGES
merge ships every app screen's trilingual dictionary (~40KB gz chunk)
to all public routes and the site's copy into /app — the split into
PUBLIC_MESSAGES/MESSAGES along the existing route boundary is a typed
refactor across every useLocale consumer; do it deliberately.

The pass's own diff was then adversarially reviewed BEFORE commit
(the newcode slot the skill demands) and it caught 5 defects in the
fixes above, 2 HIGH — all fixed and re-gated in the same commit:
- HIGH: paySaleCash's lost-race compensation deleted its own mirror
  without checking WHOSE row the winner settled on — when the other
  device's adopt path adopted OUR mirror, the delete destroyed the
  very payment row the sale now points at (paid sale, dangling
  pointer, cash gone from every total). Both loss branches now read
  loadSaleLink first: winner-adopted-ours → keep; true double →
  delete ours AND adopt the winner in memory (which also fixed the
  in-memory "paid sale, no money row" LOW). linkSaleToTxn's loser
  path had the mirror-image bug (releasing a claim the winner had
  settled on, making the payment spendable twice) — same guard.
- HIGH: handleSaleDone's digital path claimed the payment BEFORE
  inserting the sale, reversing the file's own residue law — a
  network blip between the two awaits stranded a payment marked for
  a sale that never landed (permanently unmatchable). Insert-first
  restored; a lost claim now demotes the fresh sale to EXPECTED.
- MED: post-0017, claimTxnForSale's UPDATE hits the unique index and
  threw a fake "save failed — batch may be lost" banner instead of
  the graceful rollback; 23505 on the claim now returns lost-race.
- MED: the new rail guards blocked only the money takeovers while
  openClientFromSearch (same diff) had learned Products/Settings
  hold unsaved forms too — guards unified.

Find-and-fix pass 2 (2026-08-27, three lenses: newcode over the
UNREVIEWED post-review fixes in c993498, privacy/data-lifecycle
[never run], resilience over the public surface [never run]). 6 raw,
1 HIGH confirmed, 0 refuted; all fixed, then the fix diff was itself
reviewed (3 more findings, 1 MED) and those fixed too — all in one
gated commit:
- HIGH newcode: paySaleCash's !won compensation assumed a WINNER
  exists whenever the conditional settle loses — but a sale whose
  INSERT failed earlier produces the same won=false with loadSaleLink
  null, and the branch deleted the just-minted mirror: the user's
  confirmed cash erased from DB entirely (pre-c993498 the orphan
  survived as correct income). Null link now KEEPS the mirror; only
  a link to a DIFFERENT payment row earns the delete. linkSaleToTxn's
  null case releases the claim on purpose (stranded-payment law).
- MED (review of the fix): the keep path re-exposed the recurring
  phantom-id race — two devices booting together both generate the
  same instance, 0008's ignoreDuplicates silently drops one row, and
  that device holds a PHANTOM sale id all session whose settlement
  double-counts (mirror kept + live twin settled again). Root fix:
  insertGeneratedSales is now followed by a readback (loadInstanceIds)
  that remaps phantom ids to the rows the database actually kept.
- MED resilience: Supabase answering 5xx put the literal string "{}"
  in the sign-in error box (auth-js JSON.stringify's the Response);
  "{}" now maps to the translated outage copy. Verified against
  auth-js's _getErrorMessage source.
- Adopt/heal paths no longer derive payment method from txn.source
  (provenance, not method — a hand-typed income row can be digital):
  the sale row's own method wins when the settle was lost; label
  lookups are try/caught so a thrown label fetch can't abort
  reconciliation or cry data loss.
- everythingCsv now carries the business profile and notification
  phone/consent/STOP timestamps (the pre-delete copy was missing
  exactly the records the user typed by hand; consent stamps open
  the section on their own since they outlive phone+channel).
- /privacy now discloses the founding-email capture (the one datum
  the public SITE collects) with the removal path, EN/ES/PT;
  DEPLOY.md documents the owner-side removal (Table Editor,
  lower(email) lookup). The list survives account deletion BY DESIGN
  (separate consent) — now stated.
- The founding form gained a noscript fallback: without JS/hydration
  the native submit was a GET-to-self that cleared the field and
  read as success, silently losing the signup.
Verified clean by the reviewer with evidence: linkSaleToTxn null
release, method-from-sale-row fallbacks, CSV quoting + both call
sites + demo renders, MessageKey derivation, noscript present in
prerendered HTML (React never hydrates noscript children), ES/PT
register. Trend: P1 10 raw (2 HIGH) → P2 6 raw (1 HIGH) → fix-review
3 (1 MED); severity falling, both never-run lenses came back with
only copy/lifecycle lows.

App persistence re-verified LIVE 2026-08-26 (the owner suspected
saving was broken): on production, signed in as tester via the demo
word, a $0.42 expense (with Schedule-C category), a $1.07 cash sale
and its NEW client all survived hard reloads — transactions, sales,
clients and the cash mirror all round-tripped. Saving works. What
the owner actually hit: they were TYPING INTO THE LANDING PAGE'S
DEMO on an iPhone — the ConfirmationSheet hero with the Maria
Lopez fixtures — where the keyboard opened despite DemoFrame's
inert + pointer-events-none (fine in desktop Chromium, where
focus() is refused; iOS Safari let a tap through). DemoFrame no
longer trusts the browser: a transparent absolute cover with z-10
sits above the demo (the inert wrapper gets `isolate` so no demo
z-index can climb over it) and swallows every tap, plus an
onFocusCapture blur backstop. Verified by hit-test: elementFromPoint
at the demo input's center returns the cover; the founding CTA
outside the frames still focuses. All public demos share this one
frame, so the fix covers /, /how-it-works, /for/*, /track/*.

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

v0.7 NATIVE iOS (2026-08-28, IN PROGRESS, owner-ordered — the "no
native mobile" boundary was explicitly flipped by the owner; the
roadmap's Expo idea became native SwiftUI at their direction): the
app lives in ~/Desktop/"contado native app" (Xcode 26.6, iOS 26.5,
synchronized folder groups — files dropped in build automatically).
Architecture: a SECOND CLIENT of the same backend — same Supabase
project via plain URLSession against auth+PostgREST (no SDK; RLS is
the boundary exactly as in the browser), same Vercel API routes
(/api/extract multipart with Bearer, /api/demo-session for the demo
word, NEW /api/config serving the public Supabase URL+anon key so
nothing is hardcoded in the binary). Magic link deep-links to
contado://auth-callback (DEPLOY.md documents the Redirect URLs
entry, owner-side). Tokens in Keychain; 401 retried once through a
token refresh (the JWT-skew transient becomes invisible). All pure
logic ported 1:1 (money incl. comma-decimal + the 0.125 guard,
matching, recurring incl. the jsonb cadence object, insights,
dashboard, CSVs, search fold, recommend, mileage, set-aside, recap,
customer-memory, photo budget); messages.json GENERATED from the web
fragments (714 keys x3, never hand-copied). Every screen ported to
SwiftUI phone-first (no desktop rail, no RecentSales takeover — its
function reachable via History/Owed/Clients). The store carries the
web's laws: serial write queue, sticky saveFailed, loadFailed gates,
merge-not-replace, conditional settlement + server-truth rechecks +
the c993498/a778f60 loss-state handling, generation readback remap,
photo-bytes-lazy egress law, account-keyed state reset, sign-out
queue drain. An 8-agent parity audit (webapp as spec) checked 335
features: 285 parity at first pass, 49 findings, ALL 7 HIGH + the
consequential MEDIUMs fixed (worst: recurring cadence was being
written flat-string vs the web's jsonb object — weekly templates
would silently degrade to monthly cross-client). DONE 2026-08-30:
BUILD SUCCEEDED and VERIFIED IN THE SIMULATOR AGAINST PRODUCTION —
terms gate (exact copy, version 2026-08-15), tester sign-in via the
live demo endpoint, hub totals $1.07 / +$120.50 owed / −$34.62 · 3
items matching the web to the cent, Owed tab with Rosa Márquez and
the 16-day amber flag. Build gotchas, recorded: derivedData must
live OUTSIDE ~/Desktop (iCloud file-provider xattrs make codesign
fail with "resource fork/Finder information not allowed"); the
custom Info.plist sits at the PROJECT ROOT (inside the synchronized
folder it double-produces); files using @Published need an explicit
`import Combine` under Xcode 26 member-import visibility. STILL
OPEN: real magic-link round trip (needs the contado://auth-callback
Redirect URL, owner-side), camera/photo-attach on device, an ES/PT
native run-through, the 26 LOW-severity parity items (session log),
all App Store work (signing team, icons, TestFlight), and one parity
gap from the 2026-09-01 post-deploy pass: the web now maps auth-js
error code over_email_send_rate_limit to signin.tooMany and counts
down a 60 s resend; native SignInView has neither, and the two new
keys (signin.tooMany, signin.resendIn) are not in messages.json yet —
regenerate it from the web fragments (never hand-copy) when porting.

AUTH EMAIL LANGUAGE (2026-09-01). The sign-in emails send through the
owner's Google Workspace SMTP (mail@getcontado.com; SPF/DKIM/DMARC in
Cloudflare) and the four templates are CUSTOMIZED AND OWNED IN THE
SUPABASE DASHBOARD — never regenerate or overwrite them from here. So
they can localize, `user_metadata.lang` now carries the reader's
language and nothing else: signInWithOtp stamps `data.lang` at ACCOUNT
CREATION (web sign-in.tsx / native sendMagicLink), and afterwards a
signed-in device re-stamps it through auth.updateUser when a change
made on THAT device leaves its language different from the stored
value — the picker moving, a sign-in, a cold launch on a device set to
another language — so the last device in wins. Precisely: a cold launch
compares against the user object auth-js hands back, which is the
CACHED one for roughly the first 58½ minutes of a token's life — auth-js
refreshes only within EXPIRY_MARGIN (90 s) of expiry or after it, and
Supabase tokens last an hour — so in that cached span a launch sees its
own last value and does not write; within 90 s of expiry or past it,
auth-js refreshes and the refresh response carries a fresh user, so the
launch re-stamps. A background token
refresh is NOT a trigger: the web effect latches the (account,
language) pair it has reconciled BEFORE the in-sync check, because
`user` changes identity on every auth event and a refresh carries what
another device just wrote; latching only on writes made an idle
desktop tab revert a phone's choice on every JWT refresh (found by the
post-deploy find-and-fix pass, fixed) (web upload-screen effect, native
AppStore.pushEmailLanguage — both skip the shared tester account, both
fire-and-forget). Always "en" | "es" | "pt"; MISSING READS AS "en"
everywhere, template side included. The UI language itself stays
per-device (the settings law) — this only decides what the inbox says.
The `{{ if eq .Data.lang "es" }}` conditionals are the owner's, added
in the dashboard; no template edits ship from this repo.

POST-DEPLOY FIND-AND-FIX (2026-09-01, four lenses never run on this
surface — newcode, authz/exposure of user_metadata, capacity/quotas,
privacy lifecycle; 5 raw findings, each verified adversarially).
Tooling first: tsc/eslint clean; the sharp <0.35 libvips CVE rejected
with evidence (optional dep of next, nothing imports next/image, live
/_next/image 400s, /api/extract forwards bytes to OpenAI undecoded —
`npm audit fix --force` would bump next out of range for an
unreachable path). Privacy: CLEAN — only {lang} is written, GoTrue
merges per key (models.User.UpdateUserMetaData), the purge deletes the
auth row, zero console lines added. Authz: CLEAN — 34 policies, the
one JWT read is auth.jwt()->>'email' (not user-writable); GoTrue
renders {{ .Data }} through html/template, so a hostile lang only
garbles its owner's own email. FIXED this pass: (1) the sync effect
latched its ref only on the WRITE path, so a TOKEN_REFRESHED carrying
another device's value re-armed it — an idle desktop tab reverted a
phone's "pt" to "en" every JWT refresh; the ref now latches BEFORE the
in-sync check. The own-diff review of THAT fix found a regression inside
it — two picker taps inside one write's flight time left the second tap
reading a stale "in sync" and skipping its write, with the new latch
then blocking the heal the old order got for free — so the write's
resolution now drops the latch and re-runs the effect when the device
moved on mid-flight, and a sign-out resets the latch so "a sign-in" is
a real trigger. Harness v2 replays all of it: 0 refresh writes, the
mid-flight double tap heals to the device's choice, picker wins, a
reorder costs at most one duplicate write, failed writes retry, two
accounts on one device both stamp, 50 refreshes write nothing; (2) the
project-wide auth-email bucket is 30/h and ALREADY TRIPPED three times
on launch night with raw English "email rate limit exceeded" on the
screen — auth-js code over_email_send_rate_limit now maps to
signin.tooMany (EN/ES/PT) and Resend counts down 60 s; (3) /api/extract
now exports maxDuration=60 and aborts the OpenAI fetch at 55 s (a stall
cost 300 s of a 2 GB function). WRITTEN, NOT APPLIED: migration 0019 —
any visitor holds a real tester session and could PUT /auth/v1/user to
reset the demo password (revoking every visitor) or its metadata; a
BEFORE UPDATE trigger on auth.users makes the tester row's
password/email/phone/metadata read-only. Verified before writing:
auth.users is owned by supabase_auth_admin and the SQL-editor role is
NOT a member of it (TRIGGER privilege only), so the file never drops or
disables the trigger — it creates it only if absent and reads an on/off
row in public.tester_lock, which `postgres` does own; rotation flips
that row (DEPLOY.md). The tester hash is a plain $2a$10$ bcrypt, so
GoTrue's login writes only last_sign_in_at and the trigger stays quiet.
The sign-in cooldown is a clock deadline (iOS suspends timers while the
user fetches the link in Mail) and also arms on the 429 itself. OWNER-SIDE, BLOCKING before
any launch push: the Vercel team is on HOBBY (non-commercial licence,
360 GB-hr/month hard stop) — upgrade to Pro; raise the auth-email cap
to 60–80/h and enable Turnstile/hCaptcha on the OTP endpoint (the anon
key is public; 30 junk addresses drain the hour in seconds). DEFERRED
with reason: /api/extract has no per-account image budget and its
brake is per-IP per-instance — the OpenAI spend cap bounds the money
(accepted in the route comment); DEMO_EXTRACTION=mock in Vercel is the
outstanding half of it. Known/accepted, not re-reported: a real user
whose email local part is "tester" is treated as the demo account (the
convention's cost, recorded above).

CLEAN-PASS LOOP (owner asked for three consecutive clean passes; a pass is
clean when nothing survives verification that needs a change under src/
or supabase/, and any landed fix resets the count). PASS 1 (newcode over
the previous fix batch + deploy-headers/CSP + state-machine enumeration +
migration of persisted device/DB state): NOT CLEAN — count reset to 0.
State-machine and persisted-state came back clean with evidence (every
localStorage key ever committed enumerated with its reader's fallback; no
duplicate matched_sale_id rows; no legacy flat-string cadences). The
deploy-headers lens found a CRITICAL that predates today's work, confirmed
by two verifiers with a live demonstration on production: since c993498
(2026-08-28) the landing page loaded the Supabase SDK ONLY when an
sb-*-auth-token key already existed, yet magic links land on the bare
origin (the only allowed redirect — /app is not on the list), so on every
NEW device the link verified server-side and then died on the marketing
page, signed out; no OTP session created after that commit had ever been
refreshed. FIXED: the landing now forwards any #access_token / #error
fragment to /app with a full-document replace, where the client is always
constructed and consumes it; supabase-js stays out of the landing bundle;
DEPLOY.md gained the fresh-private-window magic-link check as the
regression guard. VERIFIED LIVE on the bare apex URL with a hard reload:
a fake #access_token fragment forwarded to /app and the SDK consumed it
(GET /auth/v1/user fired). Lesson recorded in DEPLOY.md: a re-visit in
the same browser can reuse the cached "/" document (no validators), and
the edge briefly kept the previous build's HTML after the deploy —
verify with a fresh window or a hard reload, never a plain re-visit.
Also fixed from the newcode slot: the demo account's
Sign out used auth-js's default "global" scope, so one visitor's Sign out
deleted every concurrent demo session (three were live) — now "local" for
the demo account, unchanged for real accounts (an owner call); and the
second GoTrue 429 code (over_request_rate_limit, the per-IP bucket a
venue's shared Wi-Fi trips) now gets the same localized copy and cooldown
as the email bucket. Headers observed live: frame-ancestors 'none' and
X-Frame-Options DENY on every response (the signed-in app is not
framable); HSTS present; X-Content-Type-Options / Referrer-Policy /
Permissions-Policy absent — hardening gaps with no demonstrated failure
path here, not findings. Observation, not a finding: a native client
caches /api/config for 24 h, so a publishable-key rotation needs the old
key kept alive that long (there is no key-rotation runbook yet).
PASS 2 (newcode over the pass-1 fixes + concurrency + performance/bundle +
copy-vs-behavior scoped to what changed since mid-August): NOT CLEAN —
count stays 0. Newcode came back clean with a live re-demonstration of
the landing forward on the apex (success AND #error fragments), and
perf/bundle clean with measured numbers (landing first-load 216 KB br,
supabase-js confirmed absent from "/" and present on /app, Lighthouse
mobile 0.87). Concurrency found a pre-existing MONEY defect, verified by
me against the code: a "Got cash" tapped on a just-generated recurring
instance inside the generation-readback window captured the PHANTOM
sale id (the one ON CONFLICT DO NOTHING had dropped) in its queued
closure; the readback remapped `sales` state only, so the item minted a
mirror linked to a sale row that never existed and settleSale hit zero
rows — the real instance stayed open, the job counted in revenue AND in
owed on every device (transactions.matched_sale_id has no FK, so the
database accepted the dangling link). The settle path's own comment
said phantoms "cannot arrive here"; they could. FIXED: a saleIdRemap ref
filled by the readback, every sale-scoped queue item (paySaleCash and
its two adopt branches, linkSaleToTxn and its rollBack, undoMatches,
both move-to-owed writes) resolves the id at RUN time, and the readback also remaps
transactions[].matchedSaleId in memory. Harness replays the exact
interleaving: OLD leaves the real instance open with one dangling
mirror and double-counts; NEW settles it with none. Also fixed: a queued
write that finds no session (the other tab signed out — auth-js clears
the shared key and broadcasts SIGNED_OUT) is now refused and remembered
in a module-level flag that the next signed-in Ledger mount turns into
the save-failed banner (a lazy useState initializer — the repo's lint
forbids synchronous setState in effects), instead of running with the
anon key into an unmounted component; and signin.tooMany now says "up
to an hour" — the project-wide email bucket is a FIXED hourly window, so
"a few minutes" was false once it was spent. OWNER NOTE: a foreign key
from transactions.matched_sale_id to sales(id) ON DELETE SET NULL would
make the database refuse this whole class; it is a migration and a
decision, not a hotfix.
PASS 3 (newcode over the pass-2 fixes + resilience + product-semantics +
schema-drift, each scoped to this week's surfaces): NOT CLEAN — count
stays 0. Schema-drift clean with SQL evidence (matched_sale_id uuid ==
client string ids, occurred_on serializes YYYY-MM-DD so the remap key
matches). The rest was mostly MY OWN previous fix: (1) HIGH, found by
two lenses independently with harnesses against the real auth-js —
the persist guard read "session null" as "signed out", but auth-js also
returns null WITH an AuthRetryableFetchError, keeps the stored session
and emits no SIGNED_OUT when the token has expired and the refresh
fails offline; the write was dropped and the footer still said "Saved
to your account" — the exact state that used to banner. FIXED: the
guard throws that error into the existing catch; only a session-less,
error-less read is quiet. (2) HIGH — a boot whose insertGeneratedSales
failed left the generated instance ON SCREEN; "Got cash" minted a
mirror against a row that never existed and the null-link branch kept
it, while the next boot regenerated the instance open: revenue AND
owed, and a re-tap doubled revenue. FIXED: the failed insert now takes
the instances off the screen and restores the templates before
rethrowing, and the null-link branch treats a RECURRING instance's
missing row as a failed save (mirror removed, job back in owed, banner)
rather than as a hand-logged sale's kept income. (3) MEDIUM/LOW —
undoMatches and linkSaleToTxn's rollBack still used tap-time ids;
resolved now. (4) LOW, copy: the cold-launch sentence above was
overstated and is now precise. Product-semantics also proved the
readback's "phantom kept alongside the real id" state unreachable, so
it is no longer listed anywhere as a cosmetic case.
PASS 4 (narrow and deep on ea6f0d9: newcode + resilience +
product-semantics + concurrency, all scoped to the changed regions):
NOT CLEAN, but the trend broke — one MEDIUM and three LOWs, no HIGH,
and the money figures were traced correct through every settle outcome
with the real receivedCents/owedCents/byMonth (the home "business"
figure is business transactions + EXPECTED sales; a paid sale enters
revenue only through its one transaction, so matched-vs-unmatched never
touches a sum). FIXED: (1) MEDIUM — a NON-retryable refresh failure
(revoked refresh token) makes auth-js remove the session and broadcast
SIGNED_OUT before getSession resolves, so the guard's throw landed on an
already-unmounted Ledger and the flag was never set; the guard now sets
the flag for non-retryable errors (isAuthRetryableFetchError decides)
and still throws. (2) LOW — the two revert paths (a generated instance
whose insert failed; a "Got cash" on a row that never landed) showed
"Saved on screen but not to your account" while having deliberately
taken the data OFF the screen; they now throw a RevertedWrite carrying
its own key (home.errRecurringNotSaved / home.errCashNotSaved, EN/ES/PT)
and do not raise the sticky flag. (3) LOW — the "3 missed — still
active?" notice survived the generation catch rolling that pause back;
the catch clears it. (4) LOW — the run-time memory re-link in
linkSaleToTxn (and the mirror replacement in paySaleCash) wrote over a
snapshot and could resurrect a link the user had already undone; both
are now conditional on the row still carrying the tap-time id. Copy
precision: the cold-launch sentence above now says 90 s of expiry, not
"expired".
PASS 5 (narrow and deep on e40f947: newcode + resilience + concurrency +
copy-vs-behavior): NOT CLEAN by the rule (a message file is src/), but
nothing above LOW and no money or write-loss path: the guard was
enumerated against the real auth-js through every getSession shape —
storage empty, valid, expired+retryable, the 60 s cooldown replays,
expired+non-retryable (SIGNED_OUT before resolve), refresh succeeding
mid-call, the 90 s margin's proactive-preserve, blocked storage — and
no shape drops a write without a banner or the flag; the conditional
re-links and undo orderings traced consistent; the new strings match
the real button and tab labels in all three languages. Five LOW
findings, two root causes, both copy: home.errCashNotSaved claimed the
job was "back in Owed" (false once the generation rollback has removed
it from the screen) and "try again in a moment" (a re-tap fails the same
way until the next boot regenerates the row) — reworded to what is true
in both states: it comes back the next time the app opens, tap it then;
and the cold-launch sentence above named the wrong window — precise
now. Severity trend across the loop: CRIT → MED(money) → 2×HIGH → MED →
LOW-only.
PASS 6 (narrow on e69da85: newcode over e40f947..e69da85 + a truth
sweep of every string and doc sentence added this week; both agents told
that zero is the expected answer if true): CLEAN — count 1 of 3.
Evidence: home.errCashNotSaved traced true in both reachable states (the
instance still on screen; the generation rollback already removed it) and
in the landed-after-timeout case — the next boot's walk regenerates the
row OPEN or loadSales returns it open, and a re-tap's settleSale wins;
the cold-launch sentence checked clause by clause against auth-js
2.111.0 (EXPIRY_MARGIN_MS = 3 × 30 000; __loadSession and
_recoverAndRefresh apply the same margin test); signin.tooMany's "up to
an hour" holds against GoTrue's IntervalLimiter (fixed 1 h window, worst
case under an hour); the Resend countdown never paints below 0 or above
60 (a React harness saw a stale 67 s in a commit, never in a painted
frame); DEPLOY.md's ceilings, redirect and migration claims re-checked
against code and READ-ONLY SQL (0019 trigger absent, tester hash
$2a$10$, 0017/0018 live); ten CLAUDE.md claims confirmed (34 policies,
auth.users ownership, no FK on matched_sale_id, html/template rendering,
per-key metadata merge, local-scope demo Sign out, the set-state lint
rule at level 2). Owner ruled: two stale CODE COMMENTS in
upload-screen.tsx do not count against the pass — the null-link
branch's comment still says "banner plus the sticky saveFailed" (false
since e40f947 made a RevertedWrite non-sticky) and the readback comment
above loadSaleLink says phantom ids "cannot arrive here" (the branch
below has handled them since ea6f0d9); fix both inside the next src/
commit. Fixed as docs, no reset: DEPLOY.md's browser-cache clause blamed
missing validators for a re-visit reusing the old landing; `/` is served
max-age=0, must-revalidate, so a plain re-visit refetches (from an edge
that may itself be stale) and only a Back/forward restores without a
request — advice unchanged, mechanism corrected. Left as stated, not
verifiable from the repo: "tokens last an hour" (dashboard JWT setting)
and "tripped three times" (GoTrue log).
PASS 7 (lens rotation — every lens in the loop's list had run, so three
never-run angles: docs-newcode over 52d231d, TIME/DATE semantics, and
ACCESSIBILITY on this week's UI; plus i18n completeness by tooling: 725
keys in 19 modules, all three locales on every key, placeholders agree,
every key used in src/ resolves): NOT CLEAN — count reset to 0.
Docs-newcode: clean, every clause of the pass-6 record confirmed against
code, auth-js, GoTrue source, live headers and read-only SQL. Time/date:
recurring generation is pure string date math — byte-identical output
under UTC, Chicago and Kiritimati across month-ends, Feb 29, both DST
edges and a 3-year gap; byMonth, recap and the CSV bucket by string
slice — clean there. FIXED: (1) HIGH, confirmed by an adversarial
verifier: the OpenAI prompt's "Today is …" came from the Vercel clock,
which is UTC — tomorrow from ~5 pm PDT / 7 pm CDT / 8 pm EDT every
evening — so the model dated "Today", "Yesterday", weekday and year-less
rows one day late. The row is saved before confirmation with no flag
(the amber ring measures how well the label was READ, and "Today" reads
perfectly), the duplicate screen keys on the exact date string, so an
evening upload plus the next morning's overlapping re-upload persisted
the same payment twice, and a month-end, quarter-end or Dec-31 evening
moved income into the next period's byMonth and tax CSV. Now the client
sends its local date and IANA zone; src/lib/extract/today.ts resolves
the day (the zone applied to the SERVER clock → the client's date when
real and within two days → the UTC slice), the Extractor contract
carries it, and the prompt also states the weekday and forbids dates
after today. Harnesses: 21:00 PDT resolves to 09-01 (was 09-02) under
any server zone; bogus zones, "2026-02-31", a 3-year skew and an
injection-shaped zone all fall back safely; the request body sent to
OpenAI carries "Today is 2026-09-01 (Tuesday)" and the mock still runs.
NATIVE GAP: ExtractClient.swift sends only screenshots, so the iOS app
keeps the UTC day until it appends the same two fields (today,
timeZone) — the route's fallback keeps it working meanwhile. Accepted:
"Today" in a screenshot means the day it was CAPTURED; one uploaded days
later is still dated on upload (a per-file capture date would fix it).
(2) MEDIUM (reported HIGH by the a11y lens; one root cause): the error
paragraphs on sign-in (rate limit, unreachable, demo failure) and the
ledger's save-failed banner were plain <p> — nothing was announced to a
screen reader while the focused button disabled or unmounted, so a
failed "Got cash" was silent for exactly the user the banner exists for;
all three carry role="alert" now (an inserted alert is announced).
(3) LOW: the Resend deadline is wall-clock, so a clock set BACK inside
the window inflated it ("Resend in 3640s", button held that long) —
tick clamps it to 60 s, and startCooldown samples the clock so the
first commit reads 60, not 61 (harness: OLD max 3640, NEW max 60; a
forward jump still ends it early). Plus the two stale comments the owner
ruled on in pass 6. DEFERRED with reason: the two existing aria-live
regions (signin.newLinkSent, saleNotice) mount together with their
content, which VoiceOver may not announce — pattern-level, not verified
against assistive tech, and the countdown gives an indirect cue.
Observation, not this week's: text-neutral-500 on the dark theme
measures ≈4.2:1 on secondary text app-wide.
PASS 8 (newcode over 2b8166b — my own pass-7 edits, two agents: the
extraction date fix; the sign-in cooldown + alert roles + rewritten
comments): CLEAN — count 1 of 3. Extraction: 44 zone spellings at a
fixed instant (aliases, lowercase, Etc/GMT±N, offsets) all yield strict
YYYY-MM-DD or throw into the client-date fallback — no crash; the
two-day tolerance accepts exactly ±2 and rejects Feb 30, 2023-02-29 and
padded forms; a valid zone always beats a bogus client date; both DST
edges in Chicago and the half-hour zones resolve to the right day;
weekdayOf agrees with the local weekday on ten dates; the real route
POST (fetch stubbed) drops a File-typed or 65-char hint, never echoes
a hint into the body or logs, and pre-auth work is one Intl construct;
the only extract() caller is the route; the FormData fields ride in
every chunk; the mock still runs. Bounded, documented, not a finding: an
unknown zone plus a clock ≥10 h wrong can date rows up to two days
ahead, visible and editable on the sheet. Sign-in: the clamp settles in
one effect re-run (harness), the synchronous tick() is the pre-existing
shape, both startCooldown call sites unchanged, the first commit reads
60, a long sleep clears rather than re-arms, the alert and the polite
region never coexist, setError fires only on outcomes, and every
setStatus("error") site sets its message first. One LOW, comment-only
(does not count, per the pass-6 ruling; fix inside the next src/
commit): the rewritten phantom-id comment above loadSaleLink says "a
tap queued inside that window can still carry one" — since a488a44
every queued item resolves its id at run time through canonicalSaleId,
so a phantom reaches the branch only when the readback itself failed
to remap it (threw, or found no twin), which the comment two lines
below already states.
SECURITY AUDIT + FIX BATCH (2026-09-03; report artifact
https://claude.ai/code/artifact/57555f00-7ca1-4611-b8f6-2b4cfa6e4716; 0
CRITICAL, 1 HIGH, 7 MEDIUM, 9 LOW; everything above LOW verified
adversarially). This commit lands every code-side fix, implemented by
five Sonnet work packages and reviewed line by line, gated (tsc, eslint,
next build) and proven by harnesses; it is a src/ change, so the
clean-pass count resets to 0. Landed: an enforced CSP (script-src
self + inline + GTM; connect/img limited to Supabase, GA and self;
object/frame none; base-uri/form-action self) plus HSTS preload, nosniff,
Referrer-Policy, Permissions-Policy, COOP and /.well-known/security.txt;
/api/extract checks the token BEFORE parsing the body, rejects oversized
content-length with 413, caps filenames at 120 chars, and reads
cf-connecting-ip first (Cloudflare proxies production); /api/demo-session
checks the demo word server-side (DEMO_WORD env, default "tester");
both inbound webhooks refuse unsigned POSTs in production (503) and the
service-role client refuses to construct without the provider's signing
secret; phone numbers are masked in logs; /api/notify/test is deleted;
/api/health no longer echoes PostgREST errors; the validator caps rows
(100) and warnings (40), strips control characters and caps payer (200)
and memo (2000); a warning's filename survives only if it names an
actual upload; the confirmation sheet gained a per-row "Not a payment"
control that deletes the already-saved row through the write queue;
/api/founding calls the founding_signup RPC with a fallback to the old
insert until 0020 is applied; the deletion request upsert uses
ignoreDuplicates so it needs no UPDATE right; the privacy page gained
what-we-store / processors / retention / rights sections in EN/ES/PT
and the three "never stored" claims now say what OpenAI's 30-day
abuse-monitoring retention makes true. APPLIED 2026-09-03 via the MCP, both
verified with SQL afterwards (0019: trigger present, lock enabled, demo
word still signs in; 0020: every object listed in DEPLOY.md): migration
0020 (statement-level demo cap trigger, 300 rows per table for the
tester and no photos, on INSERT and, for sales, UPDATE; octet_length
bounds on every text column; founding_signup RPC replacing the anon
INSERT policy; deletion cooling-off pinned in the UPDATE policy;
transactions_matched_sale_key re-scoped to (account_id,
matched_sale_id); TRUNCATE revoked from anon/authenticated; nightly
reset_demo_rows that sweeps visitor rows older than a day but keeps
rows created before 2026-09-03 as seed). DONE 2026-09-03 with the owner's approval (proxy kept and hardened):
DMARC p=quarantine strict-aligned and SPF -all; Cloudflare Full
(strict), TLS 1.2 minimum, Web Analytics injection off, a rate-limit
rule on demo-session + founding, a www CNAME + redirect rule, CAA,
DNSSEC (DS pending at the registrar); Vercel Authentication on preview
deployments (verified: the branch alias 302s to SSO, production alias
still 200). Still owner-side: the OpenAI zero-data-retention setting.
The settings.privacyPromise sentence now matches the privacy page. Not fixed by design: the demo route still returns a refresh
token (dropping it would sign demo visitors out hourly); the native app
still sends no today/timeZone fields.

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
