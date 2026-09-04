-- Apply after deploying the server-side service key and before the new routes.
-- Only server-authenticated RPCs may reserve paid work or accept signups.
begin;

create table if not exists public.security_limits (
  singleton boolean primary key default true check (singleton),
  account_images_daily integer not null default 40 check (account_images_daily > 0),
  demo_images_daily integer not null default 10 check (demo_images_daily > 0),
  project_images_daily integer not null default 200 check (project_images_daily > 0),
  project_images_monthly integer not null default 1000 check (project_images_monthly > 0),
  account_concurrent integer not null default 2 check (account_concurrent > 0),
  project_concurrent integer not null default 8 check (project_concurrent > 0),
  founding_ip_hourly integer not null default 5 check (founding_ip_hourly > 0),
  founding_project_hourly integer not null default 50 check (founding_project_hourly > 0)
);
insert into public.security_limits(singleton) values (true) on conflict do nothing;
alter table public.security_limits enable row level security;
revoke all on public.security_limits from public, anon, authenticated;

create table if not exists public.extraction_usage (
  id uuid primary key default gen_random_uuid(),
  -- Preserve anonymous aggregate spend after account deletion, so deletion
  -- cannot reset the project's budget. No images, emails or output retained.
  account_id uuid references auth.users(id) on delete set null,
  images integer not null check (images between 1 and 20),
  created_at timestamptz not null default now(),
  lease_until timestamptz not null default now() + interval '120 seconds'
);
create index if not exists extraction_usage_created_idx on public.extraction_usage(created_at);
create index if not exists extraction_usage_account_idx on public.extraction_usage(account_id, created_at);
alter table public.extraction_usage enable row level security;
revoke all on public.extraction_usage from public, anon, authenticated;

create table if not exists public.founding_attempts (
  id bigint generated always as identity primary key,
  -- HMAC of the address using a server-only secret; never store raw IPs.
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists founding_attempts_created_idx on public.founding_attempts(created_at);
create index if not exists founding_attempts_ip_idx on public.founding_attempts(ip_hash, created_at);
alter table public.founding_attempts enable row level security;
revoke all on public.founding_attempts from public, anon, authenticated;
revoke all on sequence public.founding_attempts_id_seq from public, anon, authenticated;

create or replace function public.reserve_extraction(p_account_id uuid, p_images integer)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  limits public.security_limits%rowtype;
  reservation uuid;
  current_time_ timestamptz;
  day_start timestamptz;
  month_start timestamptz;
  account_limit integer;
  demo boolean;
  daily_total bigint;
  monthly_total bigint;
  account_total bigint;
  active_total bigint;
  active_account bigint;
begin
  if p_account_id is null or p_images is null or p_images not between 1 and 20 then
    raise exception 'invalid extraction request' using errcode = '22023';
  end if;
  select split_part(coalesce(email, ''), '@', 1) = 'tester' into demo
    from auth.users where id = p_account_id;
  if not found then
    raise exception 'unknown account' using errcode = '22023';
  end if;
  -- All instances reserve under one transaction lock. Limits and leases
  -- are checked and consumed atomically, never by a browser or user JWT.
  perform pg_advisory_xact_lock(742096001);
  current_time_ := clock_timestamp();
  day_start := date_trunc('day', current_time_ at time zone 'UTC') at time zone 'UTC';
  month_start := date_trunc('month', current_time_ at time zone 'UTC') at time zone 'UTC';
  select * into strict limits from public.security_limits where singleton;
  account_limit := case when demo then limits.demo_images_daily else limits.account_images_daily end;
  delete from public.extraction_usage where created_at < current_time_ - interval '35 days';
  select coalesce(sum(images) filter (where created_at >= day_start), 0),
         coalesce(sum(images) filter (where created_at >= month_start), 0),
         coalesce(sum(images) filter (where account_id = p_account_id and created_at >= day_start), 0),
         count(*) filter (where lease_until > current_time_),
         count(*) filter (where account_id = p_account_id and lease_until > current_time_)
    into daily_total, monthly_total, account_total, active_total, active_account
    from public.extraction_usage;
  if monthly_total + p_images > limits.project_images_monthly then
    return jsonb_build_object('allowed', false, 'retry_after',
      ceil(extract(epoch from (month_start + interval '1 month' - current_time_))));
  end if;
  if daily_total + p_images > limits.project_images_daily or account_total + p_images > account_limit then
    return jsonb_build_object('allowed', false, 'retry_after',
      ceil(extract(epoch from (day_start + interval '1 day' - current_time_))));
  end if;
  if active_total >= limits.project_concurrent or active_account >= limits.account_concurrent then
    return jsonb_build_object('allowed', false, 'retry_after', 120);
  end if;
  insert into public.extraction_usage(account_id, images, created_at, lease_until)
    values (p_account_id, p_images, current_time_, current_time_ + interval '120 seconds') returning id into reservation;
  return jsonb_build_object('allowed', true, 'reservation_id', reservation);
end;
$$;
revoke all on function public.reserve_extraction(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_extraction(uuid, integer) to service_role;

create or replace function public.finish_extraction(p_reservation_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  -- Completing or failing releases concurrency, not spent usage. A timeout
  -- may already have cost money; crash recovery uses the lease expiry.
  update public.extraction_usage set lease_until = clock_timestamp() where id = p_reservation_id
$$;
revoke all on function public.finish_extraction(uuid) from public, anon, authenticated;
grant execute on function public.finish_extraction(uuid) to service_role;

-- Remove the old public entry point AND the table write fallback.
revoke all on function public.founding_signup(text) from public, anon, authenticated;
revoke insert on public.founding_list from anon, authenticated;
drop policy if exists "founding: public signup" on public.founding_list;

create or replace function public.founding_signup_limited(p_email text, p_ip_hash text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  limits public.security_limits%rowtype;
  current_time_ timestamptz;
begin
  if p_email is null or octet_length(p_email) > 320
     or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid signup' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(742096002);
  current_time_ := clock_timestamp();
  select * into strict limits from public.security_limits where singleton;
  delete from public.founding_attempts where created_at < current_time_ - interval '1 hour';
  if (select count(*) from public.founding_attempts) >= limits.founding_project_hourly
     or (select count(*) from public.founding_attempts where ip_hash = p_ip_hash) >= limits.founding_ip_hourly then
    return false;
  end if;
  -- Count duplicates too; duplicate/new emails produce identical results.
  insert into public.founding_attempts(ip_hash, created_at) values (p_ip_hash, current_time_);
  insert into public.founding_list(email) values (lower(trim(p_email)))
    on conflict (lower(email)) do nothing;
  return true;
end;
$$;
revoke all on function public.founding_signup_limited(text, text) from public, anon, authenticated;
grant execute on function public.founding_signup_limited(text, text) to service_role;

create or replace function public.cleanup_security_usage()
returns void
language sql security definer set search_path = ''
as $$
  delete from public.extraction_usage where created_at < now() - interval '35 days';
  delete from public.founding_attempts where created_at < now() - interval '1 hour';
$$;
revoke all on function public.cleanup_security_usage() from public, anon, authenticated;
-- Production already has pg_cron. Local test databases need no scheduler.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'cleanup-security-usage') then
      perform cron.unschedule('cleanup-security-usage');
    end if;
    perform cron.schedule('cleanup-security-usage', '17 4 * * *',
      'select public.cleanup_security_usage()');
  else
    raise notice 'pg_cron missing: verify cleanup-security-usage before production deployment';
  end if;
end;
$$;

revoke truncate on all tables in schema public from anon, authenticated;
commit;
