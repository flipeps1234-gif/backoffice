-- 0034 — the founding hundred is a real hundred (owner decision 2026-10-08).
--
-- The landing page offers "the founding hundred", and until now nothing
-- stopped signup #101 from being told the founding price was theirs
-- (compliance audit #9: scarcity with nothing behind it is a dark pattern).
-- security_limits.founding_cap (default 100) is the ceiling; the owner can
-- tune it in the SQL editor like every other limit there.
--
-- founding_signup_capped answers 'ok' | 'full' | 'limited'. It is a NEW
-- function so the route deployed before this file keeps calling
-- founding_signup_limited (0022) unchanged; the new route calls this one
-- and falls back to the old one only while this file is not applied.
-- founding_signup_limited is capped too, so an old deployment can never
-- write row 101 (it answers an error, which that route shows as "try again").
--
-- Full means full for EVERYONE, including an address already on the list:
-- answering a member's address differently would tell a stranger who is a
-- founding member. The 'full' copy says "if you already joined, you're in".
--
-- Independent of the Teams migrations 0028-0033: apply in either order.
-- Idempotent: re-running changes nothing.
begin;

alter table public.security_limits
  add column if not exists founding_cap integer not null default 100;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'security_limits_founding_cap_check') then
    alter table public.security_limits
      add constraint security_limits_founding_cap_check check (founding_cap >= 0);
  end if;
end $$;

create or replace function public.founding_signup_capped(p_email text, p_ip_hash text)
returns text
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
  -- The same lock 0022 takes: one signup at a time, so two people can never
  -- both be number 100.
  perform pg_advisory_xact_lock(742096002);
  current_time_ := clock_timestamp();
  select * into strict limits from public.security_limits where singleton;
  delete from public.founding_attempts where created_at < current_time_ - interval '1 hour';
  if (select count(*) from public.founding_attempts) >= limits.founding_project_hourly
     or (select count(*) from public.founding_attempts where ip_hash = p_ip_hash) >= limits.founding_ip_hourly then
    return 'limited';
  end if;
  -- Count duplicates too (0022's rule): new and known addresses look alike.
  insert into public.founding_attempts(ip_hash, created_at) values (p_ip_hash, current_time_);
  if (select count(*) from public.founding_list) >= limits.founding_cap then
    return 'full';
  end if;
  insert into public.founding_list(email) values (lower(trim(p_email)))
    on conflict (lower(email)) do nothing;
  return 'ok';
end;
$$;
revoke all on function public.founding_signup_capped(text, text) from public, anon, authenticated;
grant execute on function public.founding_signup_capped(text, text) to service_role;

-- 0022's function, capped: an older deployment calling it can never write
-- row 101. Same signature, same answers below the cap.
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
  insert into public.founding_attempts(ip_hash, created_at) values (p_ip_hash, current_time_);
  if (select count(*) from public.founding_list) >= limits.founding_cap then
    raise exception 'founding list full' using errcode = 'P0001';
  end if;
  insert into public.founding_list(email) values (lower(trim(p_email)))
    on conflict (lower(email)) do nothing;
  return true;
end;
$$;
revoke all on function public.founding_signup_limited(text, text) from public, anon, authenticated;
grant execute on function public.founding_signup_limited(text, text) to service_role;

-- Whether the offer is still open, for the landing page's copy. Server-only
-- like the signup: the route answers {open} and the page never reads the list.
create or replace function public.founding_open()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.founding_list)
       < (select founding_cap from public.security_limits where singleton)
$$;
revoke all on function public.founding_open() from public, anon, authenticated;
grant execute on function public.founding_open() to service_role;

commit;
