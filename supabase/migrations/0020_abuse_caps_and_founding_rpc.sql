-- 0020: abuse caps on the shared demo account, byte-size floors on every
-- account, a founding-list RPC, a deletion cooling-off pin, a scoped
-- settlement index, revoked TRUNCATE, and a nightly demo reset. Several
-- unrelated review catches landed together because they all touch the
-- same "the anon key is a loaded gun, RLS is the only guard" surface.
-- Idempotent like every migration in this folder — safe to re-run.

-- ============================================================
-- 1. DEMO CAP TRIGGER
-- ============================================================
-- The shared tester account (0013, 0019's "tester" local-part convention)
-- is reachable by anyone who types the public demo word. Nothing before
-- this stopped that session from inserting rows without limit — a script
-- could grow the tables forever or stuff arbitrarily large photos into
-- sales.photo (the sales_photo_check size cap in 0010 was PER ROW, not
-- per account). This trigger caps the tester's own row count per table at
-- 300 and refuses photos entirely for the tester, and does nothing at all
-- for every real account (the split_part check returns immediately).
--
-- SECURITY INVOKER (not DEFINER): the count must run as the calling
-- session so RLS scopes "select count(*)" to that session's own rows,
-- same trick 0013's insert policy leans on. AFTER, not BEFORE: this reads
-- a transition table of the rows just proposed, and transition tables
-- only exist in AFTER triggers. In an AFTER trigger the new rows are
-- ALREADY visible to count(*), so the count alone is the test — adding
-- the transition table's size again would halve the cap. Raising inside
-- an AFTER trigger still rolls back the whole statement, so nothing
-- proposed by an over-cap INSERT is left behind. sales also gets an
-- AFTER UPDATE trigger (Postgres allows transition tables on one event
-- per trigger) so the photo ban cannot be bypassed by attaching a photo
-- to an existing row.
create or replace function public.enforce_demo_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  row_count bigint;
begin
  if split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1) <> 'tester' then
    return null;
  end if;

  -- Includes the rows this statement just added (AFTER trigger).
  execute format('select count(*) from public.%I', TG_TABLE_NAME) into row_count;

  if row_count > 300 then
    raise exception 'demo cap reached';
  end if;

  if TG_TABLE_NAME = 'sales' and exists (select 1 from ins where photo is not null) then
    raise exception 'the demo account cannot store photos';
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_demo_cap() from public, anon, authenticated;

drop trigger if exists enforce_demo_cap on public.sales;
create trigger enforce_demo_cap
  after insert on public.sales
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

-- The photo ban must also cover UPDATE (an existing demo row given a
-- photo later). Same function; the count check is a harmless no-op here.
drop trigger if exists enforce_demo_cap_update on public.sales;
create trigger enforce_demo_cap_update
  after update on public.sales
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

drop trigger if exists enforce_demo_cap on public.transactions;
create trigger enforce_demo_cap
  after insert on public.transactions
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

drop trigger if exists enforce_demo_cap on public.clients;
create trigger enforce_demo_cap
  after insert on public.clients
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

drop trigger if exists enforce_demo_cap on public.services;
create trigger enforce_demo_cap
  after insert on public.services
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

drop trigger if exists enforce_demo_cap on public.recurring_templates;
create trigger enforce_demo_cap
  after insert on public.recurring_templates
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

drop trigger if exists enforce_demo_cap on public.business_profiles;
create trigger enforce_demo_cap
  after insert on public.business_profiles
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

drop trigger if exists enforce_demo_cap on public.notification_prefs;
create trigger enforce_demo_cap
  after insert on public.notification_prefs
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

drop trigger if exists enforce_demo_cap on public.notification_queue;
create trigger enforce_demo_cap
  after insert on public.notification_queue
  referencing new table as ins
  for each statement
  execute function public.enforce_demo_cap();

-- ============================================================
-- 2. BYTE BOUNDS, EVERY ACCOUNT
-- ============================================================
-- 0010's sales_photo_check used length() — a character count, not a byte
-- count. Postgres text is UTF-8, so a 500,000-character string of
-- multi-byte characters is up to 4x that many bytes, and a JSON/base64
-- payload is ASCII anyway, so this was never the intended guard. Reissued
-- with octet_length so the number on the tin is the number that hits the
-- 500MB database ceiling DEPLOY.md tracks. These apply to every account,
-- not just the tester — the demo cap above is about ROW COUNT, this is
-- about a single row's SIZE. Added NOT VALID + VALIDATE so an existing
-- table isn't held under a long lock while historical rows are checked
-- (moot at ~11MB today, but the right shape to keep as the table grows).
alter table public.sales drop constraint if exists sales_photo_check;
alter table public.sales drop constraint if exists sales_photo_bytes;
alter table public.sales
  add constraint sales_photo_bytes
  check (photo is null or octet_length(photo) <= 500000) not valid;
alter table public.sales validate constraint sales_photo_bytes;

alter table public.transactions drop constraint if exists transactions_payer_bytes;
alter table public.transactions
  add constraint transactions_payer_bytes
  check (octet_length(payer) <= 400) not valid;
alter table public.transactions validate constraint transactions_payer_bytes;

alter table public.transactions drop constraint if exists transactions_memo_bytes;
alter table public.transactions
  add constraint transactions_memo_bytes
  check (octet_length(memo) <= 4000) not valid;
alter table public.transactions validate constraint transactions_memo_bytes;

-- category is nullable (added after the original transactions table).
alter table public.transactions drop constraint if exists transactions_category_bytes;
alter table public.transactions
  add constraint transactions_category_bytes
  check (category is null or octet_length(category) <= 200) not valid;
alter table public.transactions validate constraint transactions_category_bytes;

alter table public.sales drop constraint if exists sales_notes_bytes;
alter table public.sales
  add constraint sales_notes_bytes
  check (octet_length(notes) <= 8000) not valid;
alter table public.sales validate constraint sales_notes_bytes;

-- line_items is jsonb; cast to text to measure the serialized size.
alter table public.sales drop constraint if exists sales_line_items_bytes;
alter table public.sales
  add constraint sales_line_items_bytes
  check (octet_length(line_items::text) <= 20000) not valid;
alter table public.sales validate constraint sales_line_items_bytes;

alter table public.clients drop constraint if exists clients_name_bytes;
alter table public.clients
  add constraint clients_name_bytes
  check (octet_length(name) <= 400) not valid;
alter table public.clients validate constraint clients_name_bytes;

alter table public.clients drop constraint if exists clients_notes_bytes;
alter table public.clients
  add constraint clients_notes_bytes
  check (octet_length(notes) <= 8000) not valid;
alter table public.clients validate constraint clients_notes_bytes;

-- ============================================================
-- 3. FOUNDING SIGNUP RPC
-- ============================================================
-- 0016 let anon INSERT directly into founding_list with only a length/@
-- CHECK enforced by the column itself — no server-side validation, no
-- rate limiting the database can see, and any anon-key holder could run
-- arbitrary inserts (well-formed junk, not just real emails) straight
-- against the table. Move the write behind a SECURITY DEFINER function
-- so the table itself is closed to direct client writes; the route's
-- own validation and rate limiter (src/app/api/founding/route.ts) still
-- run first, this is the belt behind those suspenders. founding_list
-- has no source/locale column — the route only ever inserted `email` —
-- so the RPC takes just p_email.
drop policy if exists "founding: public signup" on public.founding_list;
revoke insert on public.founding_list from anon, authenticated;

create or replace function public.founding_signup(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.founding_list (email)
  select lower(trim(p_email))
  where char_length(p_email) <= 320
    and position('@' in p_email) > 1
  on conflict (lower(email)) do nothing
$$;

revoke all on function public.founding_signup(text) from public;
grant execute on function public.founding_signup(text) to anon, authenticated;

-- ============================================================
-- 4. DELETION COOLING-OFF PIN
-- ============================================================
-- 0013's update policy let an account UPDATE its own deletion_requests
-- row with no bound on requested_at — a re-request could set requested_at
-- to anything the client sends (or leave the column out of an upsert
-- payload and rely on a default that never re-fires), quietly resetting
-- or extending the 7-day cooling-off window in ways the UI never showed.
-- The client's own upsert no longer needs this arm at all (see
-- src/lib/supabase/deletion.ts's ignoreDuplicates change below), but the
-- policy is pinned here regardless — a policy is the actual guarantee,
-- a client code path is just today's caller.
drop policy if exists "own deletion: update" on public.deletion_requests;
create policy "own deletion: update" on public.deletion_requests
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id and requested_at >= now() - interval '1 minute');

-- ============================================================
-- 5. SCOPED SETTLEMENT INDEX
-- ============================================================
-- 0017's unique index was on matched_sale_id alone, global across every
-- account. sales.id values are UUIDs — never reused, so a cross-account
-- collision is not realistically reachable today — but the index as
-- written encodes the wrong invariant ("one payment settles this sale ID,
-- account be damned") and a future backfill or account-migration tool
-- that reassigns ids would hit it. Re-scoped to (account_id,
-- matched_sale_id), keeping 0017's reliance on Postgres treating each
-- NULL as distinct (never partial — unlinked rows were always
-- unrestricted, and stay that way). The index NAME is unchanged on
-- purpose: src/lib/supabase/transactions.ts only branches on the 23505
-- error CODE, not the constraint name, but keeping the name stable is
-- one less thing to audit.
drop index if exists public.transactions_matched_sale_key;
create unique index if not exists transactions_matched_sale_key
  on public.transactions (account_id, matched_sale_id);

-- ============================================================
-- 6. HYGIENE: NO TRUNCATE FROM THE ANON KEY
-- ============================================================
-- RLS governs SELECT/INSERT/UPDATE/DELETE, but TRUNCATE is a separate
-- grantable privilege RLS does not touch — a table-level TRUNCATE from
-- anon or authenticated would empty the WHOLE table across every
-- account, not just the caller's rows. Nothing in this app truncates
-- anything, so there is no behavior to preserve, only a capability to
-- remove. The DEFAULT PRIVILEGES clause covers tables 0021+ adds later.
revoke truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public
  revoke truncate on tables from anon, authenticated;

-- ============================================================
-- 7. NIGHTLY DEMO RESET
-- ============================================================
-- The demo cap (block 1) stops the tester account from growing without
-- bound; this is what actually shrinks it back down, so the shared demo
-- doesn't fill up with a week of every visitor's test data and hit the
-- cap for someone new. Deletes the tester's OWN rows (found by the same
-- 'tester' local-part convention as 0013/0019) older than a day, from
-- every table the demo cap watches except business_profiles and
-- notification_prefs — those are the tester's identity/settings, not
-- accumulating activity, and wiping them nightly would reset the demo's
-- name/state instead of just its clutter. SECURITY DEFINER because a
-- cron job runs as no session at all; the WHERE clauses are the entire
-- blast radius.
-- Rows created before this migration shipped (2026-09-03) are the
-- owner's seed data — what a first visitor sees — and are kept; only
-- what visitors add afterwards is swept. FK-safe in any order: every
-- child link from these tables is ON DELETE SET NULL or CASCADE (checked
-- in pg_constraint before writing this).
create or replace function public.reset_demo_rows()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tester_id uuid;
  seed_cutoff constant timestamptz := '2026-09-03T00:00:00Z';
begin
  select id into tester_id
  from auth.users
  where split_part(coalesce(email, ''), '@', 1) = 'tester'
  limit 1;

  if tester_id is null then
    return;
  end if;

  delete from public.transactions
    where account_id = tester_id and created_at >= seed_cutoff and created_at < now() - interval '1 day';
  delete from public.sales
    where account_id = tester_id and created_at >= seed_cutoff and created_at < now() - interval '1 day';
  delete from public.clients
    where account_id = tester_id and created_at >= seed_cutoff and created_at < now() - interval '1 day';
  delete from public.services
    where account_id = tester_id and created_at >= seed_cutoff and created_at < now() - interval '1 day';
  delete from public.recurring_templates
    where account_id = tester_id and created_at >= seed_cutoff and created_at < now() - interval '1 day';
  delete from public.notification_queue
    where account_id = tester_id and created_at >= seed_cutoff and created_at < now() - interval '1 day';
end;
$$;

revoke all on function public.reset_demo_rows() from public, anon, authenticated;

-- Nightly via pg_cron, same guarded shape as 0013's purge job — a
-- missing pg_cron extension (a local stack) leaves the function callable
-- by hand but schedules nothing, and re-running this file unschedules
-- any prior job of the same name before re-scheduling instead of
-- creating a duplicate.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'reset-demo-rows') then
      perform cron.unschedule('reset-demo-rows');
    end if;
    perform cron.schedule(
      'reset-demo-rows',
      '47 3 * * *',
      $cron$ select public.reset_demo_rows() $cron$
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end;
$$;
