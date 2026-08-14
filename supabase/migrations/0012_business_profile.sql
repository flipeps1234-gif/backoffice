-- Ledger v0.6.7 — business profile. Run after 0011.
--
-- The first ACCOUNT-level settings (name, owner, state). One row per
-- account; feeds the tax CSV header and the proof-of-income title.
-- Free text, no validation beyond trimming client-side — the preparer
-- reads it, no machine does.

create table if not exists public.business_profiles (
  account_id    uuid primary key references auth.users (id) on delete cascade,
  business_name text not null default '',
  owner_name    text not null default '',
  -- Two-letter US state as typed ("FL"); context for the preparer,
  -- NEVER tax logic.
  us_state      text not null default '',
  updated_at    timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

drop policy if exists "own profile: select" on public.business_profiles;
create policy "own profile: select" on public.business_profiles
  for select using (auth.uid() = account_id);

drop policy if exists "own profile: insert" on public.business_profiles;
create policy "own profile: insert" on public.business_profiles
  for insert with check (auth.uid() = account_id);

drop policy if exists "own profile: update" on public.business_profiles;
create policy "own profile: update" on public.business_profiles
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);
