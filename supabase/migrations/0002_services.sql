-- Ledger v0.3 — services catalog.
-- Run this in the Supabase SQL editor, after 0001.

create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references auth.users (id) on delete cascade,

  name         text not null,

  -- 'flat': price_cents is the whole job.
  -- 'rate': price_cents is per unit, and rate_unit says per what.
  pricing_type text    not null check (pricing_type in ('flat', 'rate')),
  price_cents  integer not null check (price_cents >= 0),
  rate_unit    text check (
    (pricing_type = 'flat' and rate_unit is null) or
    (pricing_type = 'rate' and rate_unit in ('sqft', 'hour', 'room'))
  ),

  -- Optional per-unit cost ESTIMATE for the future margin view (v0.4).
  -- Estimates only — the tax export never reads this column.
  cost_cents   integer check (cost_cents >= 0),

  created_at   timestamptz not null default now()
);

-- Two services named "Lawn mowing" would make the chips ambiguous — and the
-- app treats "lawn MOWING" as the same service, so the constraint must too.
create unique index if not exists services_account_lower_name_key
  on public.services (account_id, lower(name));

alter table public.services enable row level security;

drop policy if exists "own services: select" on public.services;
create policy "own services: select" on public.services
  for select using (auth.uid() = account_id);

drop policy if exists "own services: insert" on public.services;
create policy "own services: insert" on public.services
  for insert with check (auth.uid() = account_id);

drop policy if exists "own services: update" on public.services;
create policy "own services: update" on public.services
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

drop policy if exists "own services: delete" on public.services;
create policy "own services: delete" on public.services
  for delete using (auth.uid() = account_id);

-- transactions.service_id has existed since 0001, deliberately unconstrained
-- because this table didn't exist yet. Now it does, so point it here.
-- Null out any orphaned references first, or adding the constraint fails.
update public.transactions
  set service_id = null
  where service_id is not null
    and service_id not in (select id from public.services);

alter table public.transactions
  drop constraint if exists transactions_service_id_fkey;
alter table public.transactions
  add constraint transactions_service_id_fkey
  foreign key (service_id) references public.services (id) on delete set null;
