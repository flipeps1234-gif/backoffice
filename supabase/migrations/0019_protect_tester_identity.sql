-- 0019 — make the shared tester account's identity read-only.
--
-- Every visitor who types the demo word receives a REAL GoTrue session for
-- tester@demo.dem (src/app/api/demo-session/route.ts). GoTrue lets any
-- session PUT /auth/v1/user for its own user, so that session can change
-- the tester's password (which also revokes every other live demo session)
-- or its metadata, and the public try-it-first path then 502s for everyone
-- until the owner resets it by hand. RLS is untouched — this is availability,
-- not data — but the demo is the product's front door.
--
-- Enforced HERE because no client guard can be: the endpoint is GoTrue's,
-- reached with the anon key from any browser console. The trigger fires
-- inside GoTrue's own transaction, so the whole update rolls back and no
-- session is revoked. Same 'tester' local-part convention as 0013.
--
-- OWNERSHIP, verified against production 2026-09-01: auth.users is owned by
-- supabase_auth_admin and the SQL-editor role `postgres` is NOT a member of
-- it. `postgres` holds the TRIGGER privilege (enough for CREATE TRIGGER) but
-- not ownership, so ALTER TABLE ... DISABLE TRIGGER and DROP TRIGGER would
-- fail with 42501. Therefore: (1) the trigger is created only if absent —
-- never dropped — so this file is re-runnable; (2) the on/off switch lives
-- in a table `postgres` DOES own, read by the function on every fire. To
-- rotate DEMO_PASSWORD on purpose:
--   update public.tester_lock set enabled = false;
--   -- set the new password in the dashboard, update DEMO_PASSWORD in Vercel
--   update public.tester_lock set enabled = true;
--
-- What still works: password sign-in for the demo (GoTrue writes only
-- last_sign_in_at / updated_at in the default configuration — a bcrypt
-- rehash or DB-encryption pass would also touch encrypted_password, so
-- DEPLOY.md checks the stored hash is a plain "$2a$10$" before applying),
-- token refresh, and every real account (the WHEN clause never matches).

create table if not exists public.tester_lock (
  -- One row, ever: the primary key can only be TRUE.
  only_row boolean primary key default true check (only_row),
  enabled  boolean not null default true
);
insert into public.tester_lock (only_row, enabled)
  values (true, true)
  on conflict (only_row) do nothing;

-- No policies on purpose: with RLS on and no policy, the anon and
-- authenticated roles cannot read or write the switch through PostgREST.
alter table public.tester_lock enable row level security;
revoke all on table public.tester_lock from anon, authenticated;

create or replace function public.protect_tester_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.tester_lock where enabled = false) then
    return new;
  end if;
  if new.encrypted_password is distinct from old.encrypted_password
     or new.email              is distinct from old.email
     or new.phone              is distinct from old.phone
     or new.raw_user_meta_data is distinct from old.raw_user_meta_data then
    raise exception 'the shared tester account is read-only';
  end if;
  return new;
end
$$;

revoke all on function public.protect_tester_identity() from public;

do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users'
      and t.tgname = 'protect_tester_identity'
  ) then
    create trigger protect_tester_identity
      before update on auth.users
      for each row
      when (split_part(coalesce(old.email, ''), '@', 1) = 'tester')
      execute function public.protect_tester_identity();
  end if;
end
$$;
