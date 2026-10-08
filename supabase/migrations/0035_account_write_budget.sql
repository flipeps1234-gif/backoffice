-- 0035 — a daily write ceiling per account (owner decision 2026-10-08: "a
-- generous anti-abuse ceiling — e.g. 300 sale photos and 3,000 rows per
-- account per day; only a script hits it; it says try again tomorrow; abuse
-- protection, not a usage cap").
--
-- Why (input audit F6): nothing bounded how much ONE account writes. The
-- byte CHECKs (0010/0020) bound a row, never a total, so about a thousand
-- scripted saves of a 500 KB sale photo fill the 500 MB database every
-- account shares — read-only mode for everyone on the free tier.
--
-- What counts, per account per UTC day (security_limits, tunable):
--   account_rows_daily   (3000)  every INSERT into transactions, sales,
--                                clients, services or recurring_templates
--   account_photos_daily  (300)  a sale inserted with a photo, and an UPDATE
--                                that sets or changes sales.photo (clearing
--                                it, or writing the same bytes, is free)
-- Only the client roles are metered (current_user anon/authenticated). The
-- service role and SECURITY DEFINER functions (whose current_user is their
-- owner) pass through: the server routes, the webhooks, cron, FK actions,
-- and the Teams member RPCs, which keep their own member_writes_daily.
--
-- Over the ceiling the write is refused with SQLSTATE PT429 — PostgREST
-- answers HTTP 429, code "PT429" — and the message "daily write limit
-- reached for this account". The web app's save queue (src/lib/save-retry.ts)
-- reads that as WAIT, not refuse: the entry stays on the device and is tried
-- again after the reset at 00:00 UTC, at most once an hour meanwhile — never
-- dropped, never a hot loop. A refused write spends nothing: the statement
-- rolls back, the counter with it.
--
-- The counters live in account_write_budget (RLS on, no client grants; one
-- row per account per day, earlier days pruned on the account's first write
-- of a day, removed with the account). They are spent by
-- private.spend_account_write_budget, a SECURITY DEFINER helper in a schema
-- PostgREST never exposes, which also refuses any call that does not come
-- from a trigger.
--
-- Deploy the app FIRST, then apply this file: the app deployed before it
-- reports the 429 as a refused save ("reload and enter it again"). Teams
-- (0028–0033) creates the same private schema with the same grants, so the
-- two apply in either order; nothing here reads 0028–0034. Idempotent:
-- re-running keeps tuned limits and today's counters.
begin;

-- 1. The two ceilings, in 0022's singleton row. -------------------------------
alter table public.security_limits
  add column if not exists account_rows_daily integer not null default 3000
    check (account_rows_daily > 0),
  add column if not exists account_photos_daily integer not null default 300
    check (account_photos_daily > 0);

-- 2. The counters. ------------------------------------------------------------
create table if not exists public.account_write_budget (
  account_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  rows_used integer not null default 0 check (rows_used >= 0),
  photos_used integer not null default 0 check (photos_used >= 0),
  primary key (account_id, day)
);
alter table public.account_write_budget enable row level security;
revoke all on public.account_write_budget from public, anon, authenticated;

-- 3. The helper that spends them, out of PostgREST's reach. ---------------------
-- The metering triggers run as the CALLER (they must: current_user is how a
-- client role is told from the service role and a definer function), and a
-- client role has no grant on the counters — so the spending is this one
-- definer function. Same schema and grants as Teams' 0033.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.spend_account_write_budget(
  p_account_id uuid, p_rows integer, p_photos integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'UTC')::date;
  rows_cap integer;
  photos_cap integer;
  rows_now integer;
  photos_now integer;
begin
  -- Not exposed by PostgREST; this is the second lock: only the metering
  -- triggers below spend a budget.
  if pg_trigger_depth() < 1 then
    raise exception 'the write budget is spent by its triggers only' using errcode = '42501';
  end if;
  if p_account_id is null or p_rows is null or p_photos is null
     or p_rows not between 0 and 1 or p_photos not between 0 and 1 then
    raise exception 'invalid write budget request' using errcode = '22023';
  end if;
  -- A missing settings row must never stop every save: the defaults apply.
  select l.account_rows_daily, l.account_photos_daily into rows_cap, photos_cap
    from public.security_limits l where l.singleton;
  rows_cap := coalesce(rows_cap, 3000);
  photos_cap := coalesce(photos_cap, 300);

  update public.account_write_budget
     set rows_used = rows_used + p_rows, photos_used = photos_used + p_photos
   where account_id = p_account_id and day = today
  returning rows_used, photos_used into rows_now, photos_now;
  if not found then
    -- The account's first metered write today: its earlier days are spent.
    delete from public.account_write_budget where account_id = p_account_id and day < today;
    insert into public.account_write_budget as b (account_id, day, rows_used, photos_used)
      values (p_account_id, today, p_rows, p_photos)
      on conflict (account_id, day) do update
        set rows_used = b.rows_used + excluded.rows_used,
            photos_used = b.photos_used + excluded.photos_used
      returning b.rows_used, b.photos_used into rows_now, photos_now;
  end if;

  -- Raising rolls the statement back, this count included: a refused write
  -- spends nothing.
  if rows_now > rows_cap or photos_now > photos_cap then
    raise exception 'daily write limit reached for this account'
      using errcode = 'PT429',
            detail = case when photos_now > photos_cap
              then format('At most %s photos per account per UTC day.', photos_cap)
              else format('At most %s new rows per account per UTC day.', rows_cap) end,
            hint = 'The limit resets at 00:00 UTC. The app keeps the entry and saves it then.';
  end if;
end;
$$;
revoke all on function private.spend_account_write_budget(uuid, integer, integer) from public, anon, authenticated;
grant execute on function private.spend_account_write_budget(uuid, integer, integer) to authenticated;

-- 4. The metering triggers. ---------------------------------------------------
-- Named zz_… so they fire after every other BEFORE ROW trigger on the table
-- (same-event triggers fire in name order): a row another trigger skips or
-- rewrites is seen as it will land.

-- One row per INSERT.
create or replace function public.meter_account_rows()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  -- The service role and SECURITY DEFINER functions are not metered.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  -- anon carries no account (its token has no subject): every insert policy
  -- on these tables refuses it, so there is nothing to count, and RLS gives
  -- it the same answer as before this file.
  if current_user = 'anon' or new.account_id is null then
    return new;
  end if;
  perform private.spend_account_write_budget(new.account_id, 1, 0);
  return new;
end;
$$;
revoke all on function public.meter_account_rows() from public, anon, authenticated;

-- sales: a row per INSERT, and a photo whenever one is stored. Its own
-- function: a shared one would name sales.photo on the other tables (42703;
-- 0021's note).
create or replace function public.meter_account_sales()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if current_user = 'anon' or new.account_id is null then
    return new;
  end if;
  if TG_OP = 'INSERT' then
    perform private.spend_account_write_budget(
      new.account_id, 1, case when new.photo is null then 0 else 1 end);
  elsif new.photo is not null and new.photo is distinct from old.photo then
    perform private.spend_account_write_budget(new.account_id, 0, 1);
  end if;
  return new;
end;
$$;
revoke all on function public.meter_account_sales() from public, anon, authenticated;

drop trigger if exists zz_meter_account_writes on public.transactions;
create trigger zz_meter_account_writes
  before insert on public.transactions
  for each row execute function public.meter_account_rows();

drop trigger if exists zz_meter_account_writes on public.clients;
create trigger zz_meter_account_writes
  before insert on public.clients
  for each row execute function public.meter_account_rows();

drop trigger if exists zz_meter_account_writes on public.services;
create trigger zz_meter_account_writes
  before insert on public.services
  for each row execute function public.meter_account_rows();

drop trigger if exists zz_meter_account_writes on public.recurring_templates;
create trigger zz_meter_account_writes
  before insert on public.recurring_templates
  for each row execute function public.meter_account_rows();

-- UPDATE OF photo: a PATCH that does not send the photo never fires it.
drop trigger if exists zz_meter_account_writes on public.sales;
create trigger zz_meter_account_writes
  before insert or update of photo on public.sales
  for each row execute function public.meter_account_sales();

commit;
