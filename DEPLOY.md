# Deploying contado

Read this before pushing. It exists because the same three config items
have been "I'll do it later" for several sessions, and two of them break
production silently.

## Security fixes 2026-09-04 — APPLIED TO PRODUCTION (2026-09-04 19:14–19:30 CDT)

Commit `52117c4` (branch `fix/security-review-2026-09-04`, fast-forwarded
into `main`) with migrations **0021** and **0022**. The owner authorized the
whole rollout explicitly ("deploy all", then a written authorization of
migrations, environment, deployment and smoke tests); the Obsidian
one-go-ahead rule was satisfied by that message. **Production's high-water
mark is now 0022.** What was done, in the order below, with the evidence:

- Preflight (read-only SQL via the Supabase MCP): 0 oversized rows in all
  five tables, 0 future-dated deletion requests, live `enforce_demo_cap`
  byte-identical to the 0020 baseline, pg_cron present with both jobs.
- Key: a NEW Supabase **secret API key** named `vercel_production_server`
  (`sb_secret_…`, Dashboard → Settings → API Keys, created 2026-09-04) is
  `SUPABASE_SERVICE_ROLE_KEY` in Vercel **Production only**, type Sensitive
  (unreadable in the dashboard afterwards). It was moved clipboard → `vercel
  env add … production --sensitive` and never displayed, logged or pasted.
  Secret keys carry service_role privileges and, unlike the legacy
  `service_role` JWT, are revocable on their own: to rotate, create another
  secret key, replace the Vercel value, redeploy, then delete the old key.
  The legacy JWT keys were not touched. Preview has no key (fails closed).
- Migrations via `apply_migration` (each in its own transaction, the files'
  own begin/commit dropped): `20260905001435 complete_write_guards`
  (0021) and `20260905001625 server_usage_limits` (0022). No data was
  truncated or rewritten.
- `security_verify.sql` equivalent, all green: anon/authenticated cannot
  execute any of the five functions (old `founding_signup` included);
  service_role can execute all three server RPCs; anon and authenticated
  cannot INSERT `founding_list`; authenticated keeps UPDATE on
  `deletion_requests` (native merge-upserts) with the `stamp_deletion_request`
  trigger enabled; the five byte constraints are VALIDATED; RLS on the three
  new tables with no client grants; TRUNCATE revoked; `security_limits` at
  the defaults below; cron shows all three jobs active
  (`cleanup-security-usage` at 04:17 UTC).
- Deploy: `main` pushed 19:18 CDT → `dpl_GohsSuFf4PUMqYibWJYSGeMotPje`
  READY 19:19 CDT, aliased to getcontado.com (commit `52117c4`, Next
  16.3.4). The founding form was closed between 0022 (19:16) and READY
  (19:19) — about three minutes.
- Smoke on the live apex, all with `Cache-Control: no-cache`: `/`, `/app`,
  `/privacy` 200 (x-vercel-cache PRERENDER, age 0), the new privacy
  disclosure present; CSP, HSTS preload, nosniff, Referrer-Policy and
  X-Frame-Options DENY on `/`; `/.well-known/security.txt` 200. Demo
  session 200 (tester); a synthetic `manual` cash transaction of 1 cent
  inserted (201), read back and deleted (0 left); one blank 64×32 PNG
  through `/api/extract` → 200 `{"transactions":[],"warnings":[unreadable],
  "provider":"openai"}` and `extraction_usage` gained one row (1 image,
  tester, lease closed 3.4 s later — that row is real spend and was KEPT);
  two synthetic founding signups of `smoke-20260904@example.com` → 200
  `{ok:true}` twice (duplicate identical), one `founding_list` row and two
  `founding_attempts` rows, both removed afterwards (list back to its one
  pre-existing row); unsigned POSTs to both webhooks 503, bad verify token
  403, anonymous `/api/extract` 401, malformed founding email 400. Vercel
  runtime logs for the deployment: zero warnings or errors. Local gate on
  52117c4 before the push: 22 security tests, tsc, eslint, build all clean.

The rollout procedure, kept as the record of what the steps were:

1. Run `supabase/checks/security_preflight.sql` in project
   `xdvnnqiwanpkdwvjtsfk`. Oversized-row counts must be zero; compare the
   live cap function with the baseline. Do not truncate existing data to
   make a migration pass. Confirm pg_cron and the two existing jobs.
2. Set `SUPABASE_SERVICE_ROLE_KEY` directly in Vercel's **Production**
   environment for project `prj_30RKx6YpP2XiIIqlIAz8kp7t859R` / team
   `team_k7KDw6zgiWRhnaPtdXI3LdSQ`. It must belong to this Supabase project.
   Never put it in NEXT_PUBLIC, a commit, chat or a preview environment
   pointing at production data. Keep notification signing/enabling vars off.
3. Apply `0021_complete_write_guards.sql`, then
   `0022_server_usage_limits.sql` in the SQL editor. Each is transactional.
   The files preserve seed data and pending deletion requests. 0022 closes
   the old anonymous signup RPC: the OLD deployed founding form will be
   temporarily unavailable until the new deployment is ready. Prepare the
   tested deployment first and perform these steps in one maintenance window.
4. Run `supabase/checks/security_verify.sql`: public RPC grants false;
   service-role grants true; byte constraints validated; all three cron
   jobs active (including `cleanup-security-usage`).
5. Deploy the tested branch to production, then verify READY and the apex
   as described below. Smoke one demo screenshot, a synthetic demo cash
   entry, one approved founding signup, and unsigned webhooks. Remove any
   synthetic test data. Check extraction_usage increments and its lease
   closes; do not expose access tokens or signup emails in logs.

New defaults live in `public.security_limits` (owner-only, no client grants):

| Limit | Default |
|---|---|
| Paid images per ordinary account / UTC day | 40 |
| Paid images across the shared demo / UTC day | 10 |
| Paid images project-wide / UTC day | 200 |
| Paid images project-wide / UTC calendar month | 1,000 |
| Concurrent extraction requests per account / project | 2 / 8 |
| Signup attempts per IP / project in a rolling hour | 5 / 50 |

Reservations survive instance restarts and IP changes. Failed model calls
still consume usage because an upstream timeout may already have cost money.
Concurrency is released on completion or after a 120-second crash lease.
No screenshot/filename/payment content is stored in counters. Account deletion
nulls the counter's account reference, preserving only aggregate budget usage.
The nightly cleanup removes extraction counters older than 35 days and
signup IP HMACs older than an hour; routine requests also prune these tables.
Verify the cleanup job before deploying the associated privacy disclosure.
An 8,192-token completion ceiling includes reasoning tokens; truncated
responses fail rather than silently returning partial financial records.
These are abuse ceilings, not a guaranteed dollar cap. Keep the independent
OpenAI project spending control; tune limits deliberately in the SQL editor.

**Validation:** `npm run test:security`, `npx tsc --noEmit`, `npm run lint`,
`npm run build`, and `npm audit --omit=dev`. Tests use isolated PGlite and
stubbed API calls, never production credentials, paid calls or emails.
Next and eslint-config-next are updated together to 16.3.4.

**Rollback:** prefer fixing forward. Rolling back only the application to
the old version leaves founding signup unavailable because its anonymous
RPC grant is intentionally revoked, and restores the unmetered extraction
path. Do not undo the security migration or restore anon grants as an
automatic rollback. If needed, disable extraction at the provider/project
while repairing the new deployment; viewing and exporting remain available.

## What "deploy" means here

**Pushing to `main` IS deploying.** Vercel builds and promotes every push
automatically — `vercel.json` has no ignore command and there is no branch
gate. There is no staging environment.

There is also **no CI and no test suite**, so nothing runs on push except
Vercel's own build. The entire automated gate is the three commands below,
run by you, locally, before you push.

```bash
npx tsc --noEmit && npm run lint && npm run build
```

All three must exit 0. `npm run build` runs the type-check again, but run
`tsc` separately anyway — it fails faster and its errors are clearer.

---

## Before the first real user

These are one-time, and two of them are the difference between a working
app and a broken one. **Do them before telling anyone the URL.**

### 1. Run every migration — BLOCKING

The app writes `direction` and `quantity` on every insert and selects them
on every load. If `0003` and `0004` were never run against the live
project, **every insert and every load fails** for signed-in users, while
the local anonymous build works perfectly — so you will not notice until
someone else does.

Supabase → SQL Editor → run in order, checking each succeeds:

```
supabase/migrations/0001_transactions.sql
supabase/migrations/0002_services.sql
supabase/migrations/0003_direction.sql
supabase/migrations/0004_quantity.sql
```

Verify, don't assume:

```sql
select column_name from information_schema.columns
where table_name = 'transactions'
order by column_name;
```

You need `direction` and `quantity` in that list. If either is missing,
stop and run the migration.

Current high-water mark: **0022** (0021 + 0022 applied 2026-09-04 19:14
CDT via the Supabase MCP and verified — see the section at the top of this
file). 0018 (`0018_lock_rls_auto_enable.sql`)
and 0017 were applied to production via the Supabase MCP on 2026-09-01;
**0019 (`0019_protect_tester_identity.sql`) was APPLIED to production via
the Supabase MCP on 2026-09-03 (trigger present, tester_lock enabled, demo
word verified signing in afterwards). Historical note on why it needed
care:** it was written but not applied for two days — it adds a trigger on `auth.users`, so run it yourself in the
SQL editor. Before applying, confirm the tester's stored hash is a plain
bcrypt (`select left(encrypted_password, 7) from auth.users where
split_part(email,'@',1) = 'tester';` → `$2a$10$`): GoTrue only rewrites
`encrypted_password` during login when it re-hashes or re-encrypts, and
either would make the trigger reject every demo sign-in. After applying,
confirm the demo word still signs in. The combined
file `~/Desktop/contado-combined-0001-0017.sql` predates both; append
0018 and 0019 to it before the next fresh-project setup.

**0020 (`0020_abuse_caps_and_founding_rpc.sql`) was APPLIED to production
via the Supabase MCP on 2026-09-03 and verified (9 cap triggers,
founding_signup granted to anon/authenticated, old insert policy and
grant gone, deletion UPDATE pinned, index scoped, 0 TRUNCATE grants, 8
byte constraints, both cron jobs listed). What it does** — it caps the shared tester account's row counts and
refuses it photos, replaces the character-count byte checks on
`sales.photo` with real byte counts and adds equivalent bounds on other
text columns, moves the founding-list signup behind a `founding_signup`
RPC (the API route USED to fall back to the pre-0020 direct insert when
the RPC was missing; since 52117c4 the route calls the server-only
`founding_signup_limited` RPC through the service key and 0022 revoked the
old RPC from anon/authenticated, so there is no anonymous path left),
pins the deletion-request cooling-off window, re-scopes the settlement
unique index to be per-account, revokes TRUNCATE from the anon/
authenticated roles, and schedules a nightly `reset-demo-rows` pg_cron
job. Run it in the SQL editor same as the others, then confirm
`select proname from pg_proc where proname = 'founding_signup';` returns
a row and that `select jobname from cron.job;` now also lists
`reset-demo-rows` alongside `purge-deleted-accounts`.

**Edge and DNS, set 2026-09-03 (security audit):** Cloudflare proxies the
apex (orange cloud, owner's choice) with SSL **Full (strict)** (Vercel
presents a valid Let's Encrypt cert at the origin), minimum TLS **1.2**,
Web Analytics auto-injection **off** (it was injecting a beacon the CSP
blocks and the privacy page never disclosed), one rate-limit rule (5
requests per 10 s per IP on `/api/demo-session` and `/api/founding`), and a
redirect rule sending `www.` to the apex (a proxied `www` CNAME exists for
it). The routes read `cf-connecting-ip` before `x-forwarded-for` because
Vercel overwrites the latter with the Cloudflare edge IP. DNS: DMARC
`p=quarantine; adkim=s; aspf=s` (raise to `p=reject` after two clean
weeks of reports to mail@getcontado.com), SPF `-all` (Google Workspace is
the only sender — add any new sender BEFORE it sends), CAA for
letsencrypt.org, pki.goog, sectigo.com and ssl.com (the CAs Cloudflare
Universal SSL and Vercel use; a new CA must be added here first), DNSSEC
enabled (Cloudflare is the registrar, so the DS publishes itself). Vercel:
Vercel Authentication is ON for preview deployments; production stays
public. Grey-clouding the apex later is one DNS toggle and makes the
Cloudflare TLS/rate settings moot (Vercel then terminates TLS).

```sql
select indexname from pg_indexes
where tablename = 'transactions'
  and indexname = 'transactions_matched_sale_key';
```

### 1b. Verify the account-purge cron exists — BLOCKING for the deletion promise

The public pages and the in-app terms promise that a deleted account is
erased for good seven days later. That purge is a pg_cron job created by
migration 0013; nothing in the app can see whether it was actually
scheduled. After running the migrations:

```sql
select jobname from cron.job;
```

You need `purge-deleted-accounts` in that list. If it is missing, enable
the `pg_cron` extension (Database → Extensions) and re-run the combined
migration file. Until it shows, the seven-day promise is not being kept.

### 2. Add the app's origin to Supabase Redirect URLs — BLOCKING for sign-in

> Where the link actually lands: the bare origin (`https://getcontado.com`),
> because that is the only redirect on the allow-list — `…/app` is NOT, so
> pointing `emailRedirectTo` at `/app` would silently fall back to the
> vercel.app Site URL. The landing page therefore forwards any
> `#access_token…` / `#error…` fragment straight to `/app`, where the
> Supabase client is always constructed and consumes it. Between
> 2026-08-28 and 2026-09-01 that forward did not exist: the landing only
> loaded the SDK when a session was already stored, so on every NEW device
> the link verified server-side and then died on the marketing page.
> Found by the post-deploy find-and-fix loop; the check below is the
> regression guard.

Supabase → Authentication → URL Configuration → Redirect URLs.

Add the exact production origin (e.g. `https://contado.vercel.app`).
Without it the magic link bounces to the Site URL and no session is ever
created — sign-in appears to work and then silently does nothing.

**List exact origins. Do not add a wildcard** like `https://*.vercel.app`
to make preview deploys work: any Vercel subdomain would then be a valid
redirect target for a magic-link token, which is an account-takeover path.

**For the NATIVE iOS app (v0.7)** also add exactly:

    contado://auth-callback

That is the custom URL scheme the iPhone app registers; the emailed
magic link redirects there so the session lands in the app instead of
dying in Safari. Same exact-match rule — the scheme plus that exact
path, nothing wildcarded. Until this is added, native email sign-in
sends the link but tapping it opens the website instead of the app;
the demo word works regardless.

### 3. Set `DEMO_EXTRACTION=mock` in Vercel — costs you nothing

The shared tester account otherwise uses the real OpenAI provider, and the
demo word ships in the public JavaScript bundle. The rate limiter is an
in-memory `Map`, so it is per serverless instance and cannot hold a line.
Anyone who views source can spend against your $50 cap.

Setting this flips tester to the free mock with no code change.

### Connecting Google Analytics (one time, ~5 minutes)

The site ships with GA4 wiring that stays completely dark until you
give it an ID. To turn it on:

1. [analytics.google.com](https://analytics.google.com) → Admin →
   **Create property** (name it "contado", timezone/currency US).
   Decline the optional data-sharing extras if you want the minimal
   setup — contado's own posture.
2. In the property: **Data streams → Add stream → Web**, URL
   `https://getcontado.com`. Leave **Enhanced measurement ON** — the
   site sends no manual page_view and counts client-side navigation
   through it (see `src/app/analytics.tsx`).
3. DONE for the current property: `G-JEM7B09P0L` is the committed
   default in `src/app/analytics.tsx`. Only touch
   `NEXT_PUBLIC_GA_MEASUREMENT_ID` to repoint to a different property
   (new ID) or to disable (empty string) — then redeploy.
4. After the first `founding_signup` event arrives (Admin → Events),
   toggle it as a **key event** — that is the site's one conversion.

Founding-list removal requests (the /privacy page promises this): the
list is write-only from the API by design, so removal is a dashboard
action — Supabase → Table Editor → `founding_list`, find the row (the
unique index is on `lower(email)`, so search lowercase) and delete it.
There is no in-product path on purpose; the address arrives via the
contact page.

What the site sends, and nothing else:

| Event | Fires when | Params |
|---|---|---|
| `page_view` | GA's own (config + Enhanced Measurement) | GA defaults |
| `founding_signup` | the founding-hundred form succeeds | none — never the email |
| `open_app_click` | the header "Open the app" link | beacon transport |
| `language_switch` | EN/ES/PT picker on public pages | `language` |

Nothing fires on /app or /api, a Do-Not-Track browser sends nothing,
and no event ever carries personal data. To sanity-check a live
deploy: GA Admin → **DebugView** shows the events above within
seconds of the actions.

### Changing an env var is not enough — you must redeploy

`NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**,
not read at runtime. Editing one in the Vercel dashboard changes nothing
until a new build runs. Redeploy after any change, and confirm the new
value actually shipped:

```bash
# the URL the LIVE bundle was built with, whatever the dashboard says
curl -s https://<your-app>/ | grep -o 'src="[^"]*\.js"' | head -20
```

This is not hypothetical: the first production smoke test found the app
built against a Supabase host that no longer exists in DNS.

### Environment variables

| Variable | Where | Missing means |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | No accounts; in production `/api/extract` returns 503 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Same |
| `OPENAI_API_KEY` | Vercel | Uploads return 503 — deliberately, rather than inventing rows |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Vercel, server-only | The demo word stops working. Migration 0019 makes the tester row's password/email/metadata read-only at the database (any visitor holds a real tester session and could otherwise reset its password from the console and lock every visitor out); to rotate `DEMO_PASSWORD` on purpose, run `update public.tester_lock set enabled = false;`, change it, then set `enabled = true` again (the SQL-editor role does not own `auth.users`, so the switch lives in a table it does own — never `disable trigger`) |
| `DEMO_EXTRACTION=mock` | Vercel | Tester spends your OpenAI budget |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | Vercel, optional | Settings shows "Support line — coming soon" instead of the WhatsApp link. Digits only, country code first (e.g. `15551234567`); build-time inlined, so set it and redeploy |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Vercel, optional | The contact page and footer show no email link. Build-time inlined |
| `NEXT_PUBLIC_SITE_URL` | Vercel, optional | Unset = `https://getcontado.com`, the real domain (primary on Vercel since 2026-08-22; the `*.vercel.app` origin 307s to it). Only set this if the domain ever changes — then redeploy, since every absolute URL on the site (canonicals, sitemap, robots, share cards, JSON-LD) reads it from `src/lib/site.ts` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Vercel, optional | Unset = the real property `G-JEM7B09P0L` (a measurement ID is public by nature, so it is the committed default). Set to an EMPTY string to turn analytics off, or to another ID to repoint. Set the GA4 measurement ID (`G-XXXXXXXXXX`) to count visits on the PUBLIC pages only: `/app` and `/api` never send a hit (the opt-out flag is set there and the two ways into the app are full-page navigations), and a browser sending Do Not Track gets nothing (see `src/app/analytics.tsx`). Leave GA4's **Enhanced measurement** ON (the default) — it counts client-side navigations; the app sends no manual page_view, so turning it off would undercount, and adding a manual one would double-count. Build-time inlined |

---

## Every push

**After the deploy shows READY, confirm the apex actually serves it —
in a way that cannot be fooled by a cache.** Two caches can lie to you:
Vercel's edge (check `curl -sI https://getcontado.com/ | grep -iE
'^(x-vercel-cache|age):'` — a `HIT` whose `age` is older than the
deployment is the previous build's HTML for `/`, where every magic link
lands; another production deploy purges it), and your own browser (a
back/forward navigation can restore the old page from the back-forward
cache without any request; `/` is served `max-age=0, must-revalidate`
with no ETag or Last-Modified, so a plain re-visit does refetch — but
from the edge, which may itself still be the older HIT). So the check
is: a fresh private window, or a hard reload — never a plain re-visit
or a Back. A `?x=1` query string does NOT bypass the edge for this
route (it returned byte-identical cached HTML on 2026-09-01), so it
proves nothing either way. Seen that day: the magic-link fix (8dd1797)
was READY and correct on the deployment URL while the apex `/` kept an
older `HIT`; a redeploy refreshed it, and a hard reload on the bare apex
URL then forwarded `#access_token` to `/app` as designed.

- [ ] `npx tsc --noEmit && npm run lint && npm run build` — all exit 0
- [ ] Working tree clean; you are pushing what you tested
- [ ] If you changed anything under `supabase/migrations/`, run it in the
      SQL editor **before** pushing — the code ships instantly and expects
      the column to already exist
- [ ] If you changed the sign-in flow, re-check the Redirect URLs above
- [ ] Watch the Vercel build finish. A red build means the previous
      deployment is still live, which is fine — fix forward or revert

## Smoke test, on production, signed in

**First, signed OUT, in a fresh private window** (this is the check that
would have caught the 2026-08-28 regression): open `/app`, request a
magic link for an address you can read, tap the link in the mail — you
must land on `/app` signed in, with no `#access_token` left in the URL.
If you land on the marketing page still signed out, sign-in is broken for
every new device, whatever the signed-in checks below say.

Two minutes. Do it after any push that touched upload, auth, or the database.

- [ ] `/api/health` returns `{"ok":true,"supabase":"reached"}` — **do this
      one first.** `{"ok":false,...}` means the database is unreachable and
      every step below will fail; stop and fix that. Nothing alerts on this
      endpoint, so it is only checked when a human checks it.
- [ ] First visit shows the terms screen; OK dismisses it; reload does not
      bring it back
- [ ] Sign in with a real email — the link arrives and opens a session
- [ ] Upload one screenshot: the progress bar appears, rows come back, and
      they are YOUR payments and not invented names
- [ ] Swipe one row, then reload the page — it is still there. This is the
      one that catches missing migrations
- [ ] Log a cash payment; check the amount is what you typed
- [ ] Download both CSVs; open one in a spreadsheet and check the totals
      match what is on screen

## Symptom: everything past sign-in is broken

`/api/health` returns `{"ok":false,"supabase":"TypeError: fetch failed"}`, the
sign-in screen says "Load failed" (Safari) or "Failed to fetch" (Chrome), and
the project host does not resolve:

```bash
nslookup <your-ref>.supabase.co     # NXDOMAIN
```

**That is a PAUSED Supabase project, not a deleted one.** A paused free-tier
project stops resolving in DNS entirely, which looks identical to deletion
from outside — this cost a diagnosis once already. The app shell still loads
because it is static; only the database is gone.

**Fix:** Supabase dashboard → the project → **Restore**. Data and schema
survive a pause, so migrations you already ran are still there. Then re-check
`/api/health` before anything else.

Once paused, nothing the app does can wake it — the daily cron's request
cannot reach a host that no longer resolves. Only the dashboard can.

## Rollback

There is no monitoring, so the trigger is what a user tells you or what
you see yourself. Roll back on any of:

- Rows do not survive a reload (missing migration)
- Payments appear that the user did not make (fabricated rows)
- Sign-in never completes
- Totals on screen disagree with the CSV
- Uploads fail for everyone

**How:** Vercel → Deployments → the last known-good one → Promote to
Production. That is instant and needs no git operation.

Then fix forward on a branch, or `git revert <sha>` and push. Do not force-push
`main` — the deployment history is the rollback mechanism.

Note that a rollback does **not** undo a migration, and it cannot delete rows
that were written while the bad version was live. The app has no delete.

## Free-tier ceilings to keep an eye on

| Limit | Where it bites first |
|---|---|
| OpenAI $50/month | Uploads start failing; set `DEMO_EXTRACTION=mock` first |
| Vercel 4.5MB request body | Handled client-side by compression + chunking at 4 files |
| **Vercel Hobby plan — BLOCKING before any launch push** | Hobby is licensed for non-commercial personal use only, and getcontado.com advertises a product: Vercel can pause the deployment (503 DEPLOYMENT_PAUSED) on policy alone. Separately, Hobby caps functions at 360 GB-hours/month: each `/api/extract` call holds a 2 GB function open for as long as OpenAI takes, so ~1,000 twenty-second calls/month (a few hundred active users) hits the wall and every function stops until the 30-day window resets. Upgrade the team to Pro (Settings → Billing) — it removes the licence exposure and turns the hard stop into billed usage with Spend Management |
| Vercel function duration | A large batch is sequential model calls — long uploads. `/api/extract` now exports `maxDuration = 60` and aborts the OpenAI fetch at 55 s, so one stalled model call costs a minute of function time, not the 300 s platform default |
| **Supabase auth emails — one project-wide bucket, 30/hour** | Every magic link, signup and "resend" tap draws one email from the same bucket (Auth → Rate Limits → "emails sent"; the GoTrue log shows it moving from 2/h to 30/h when custom SMTP went live). 30/h × 24 = 720 auth emails/day; Google Workspace allows 2,000/day per sending account, so Supabase binds first. It has already tripped: three 429s on launch night. The app now shows a localized "too many sign-in emails" message and a 60 s resend countdown instead of raw English. Owner side: raise the cap to 60–80/h (stays under Google's 2,000/day) and turn on Turnstile/hCaptcha for the OTP endpoint — anyone with curl and the public anon key can drain 30/h with 30 junk addresses in seconds |
| Supabase 500MB database | **Photos.** Each sale photo is ~400KB of base64 IN the row (migration 0010), so 500MB is roughly **1,200–1,500 photos project-wide**, not "thousands of rows away". Text-only rows barely register. When photo volume becomes real, move bytes to Supabase Storage (1GB free, separate meter) — an architecture change to do deliberately |
| Supabase egress (~5GB/month free) | Was the nearest cliff: the app re-downloaded every photo on every boot. Since the 2026-08-27 fix the boot pulls ids only and photo bytes load per client on demand, so egress now scales with photos actually viewed |
| Supabase Auth /token per-IP rate limit (~30 per 5 min) | All demo sign-ins leave Vercel's shared egress IPs, so ~30 demo starts per 5 min site-wide trips it. The route now answers 429 "give it a minute" instead of a fake outage |
| Supabase pausing after ~7 idle days | **Has already happened once (2026-08-12), with the cron in place.** Treat the ping as risk reduction, not a guarantee |
