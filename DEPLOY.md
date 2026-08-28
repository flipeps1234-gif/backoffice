# Deploying contado

Read this before pushing. It exists because the same three config items
have been "I'll do it later" for several sessions, and two of them break
production silently.

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

Current high-water mark: **0017** (`0017_settlement_idempotency.sql` — the
unique index that makes "one payment, one sale" a database guarantee
instead of a client guard; until it runs, the app's server-truth checks
narrow the two-device double-settlement race but cannot close it). The
combined file `~/Desktop/contado-combined-0001-0017.sql` holds everything
in order and every migration is idempotent. Verify with:

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

Supabase → Authentication → URL Configuration → Redirect URLs.

Add the exact production origin (e.g. `https://contado.vercel.app`).
Without it the magic link bounces to the Site URL and no session is ever
created — sign-in appears to work and then silently does nothing.

**List exact origins. Do not add a wildcard** like `https://*.vercel.app`
to make preview deploys work: any Vercel subdomain would then be a valid
redirect target for a magic-link token, which is an account-takeover path.

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
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Vercel, server-only | The demo word stops working |
| `DEMO_EXTRACTION=mock` | Vercel | Tester spends your OpenAI budget |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | Vercel, optional | Settings shows "Support line — coming soon" instead of the WhatsApp link. Digits only, country code first (e.g. `15551234567`); build-time inlined, so set it and redeploy |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Vercel, optional | The contact page and footer show no email link. Build-time inlined |
| `NEXT_PUBLIC_SITE_URL` | Vercel, optional | Unset = `https://getcontado.com`, the real domain (primary on Vercel since 2026-08-22; the `*.vercel.app` origin 307s to it). Only set this if the domain ever changes — then redeploy, since every absolute URL on the site (canonicals, sitemap, robots, share cards, JSON-LD) reads it from `src/lib/site.ts` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Vercel, optional | Unset = the real property `G-JEM7B09P0L` (a measurement ID is public by nature, so it is the committed default). Set to an EMPTY string to turn analytics off, or to another ID to repoint. Set the GA4 measurement ID (`G-XXXXXXXXXX`) to count visits on the PUBLIC pages only: `/app` and `/api` never send a hit (the opt-out flag is set there and the two ways into the app are full-page navigations), and a browser sending Do Not Track gets nothing (see `src/app/analytics.tsx`). Leave GA4's **Enhanced measurement** ON (the default) — it counts client-side navigations; the app sends no manual page_view, so turning it off would undercount, and adding a manual one would double-count. Build-time inlined |

---

## Every push

- [ ] `npx tsc --noEmit && npm run lint && npm run build` — all exit 0
- [ ] Working tree clean; you are pushing what you tested
- [ ] If you changed anything under `supabase/migrations/`, run it in the
      SQL editor **before** pushing — the code ships instantly and expects
      the column to already exist
- [ ] If you changed the sign-in flow, re-check the Redirect URLs above
- [ ] Watch the Vercel build finish. A red build means the previous
      deployment is still live, which is fine — fix forward or revert

## Smoke test, on production, signed in

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
| Vercel function duration | A large batch is sequential model calls — long uploads |
| Supabase 500MB database | **Photos.** Each sale photo is ~400KB of base64 IN the row (migration 0010), so 500MB is roughly **1,200–1,500 photos project-wide**, not "thousands of rows away". Text-only rows barely register. When photo volume becomes real, move bytes to Supabase Storage (1GB free, separate meter) — an architecture change to do deliberately |
| Supabase egress (~5GB/month free) | Was the nearest cliff: the app re-downloaded every photo on every boot. Since the 2026-08-27 fix the boot pulls ids only and photo bytes load per client on demand, so egress now scales with photos actually viewed |
| Supabase Auth /token per-IP rate limit (~30 per 5 min) | All demo sign-ins leave Vercel's shared egress IPs, so ~30 demo starts per 5 min site-wide trips it. The route now answers 429 "give it a minute" instead of a fake outage |
| Supabase pausing after ~7 idle days | **Has already happened once (2026-08-12), with the cron in place.** Treat the ping as risk reduction, not a guarantee |
