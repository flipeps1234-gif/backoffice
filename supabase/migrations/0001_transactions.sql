-- Ledger v0.2 — transactions.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- Money is integer cents everywhere. Never a float, never a numeric with a
-- scale we'd have to remember.

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),

  -- The owning account. Today that is one auth user; the column is deliberately
  -- named account_id, not user_id, so multi-user can unpark later without a
  -- rename and a data migration. See the monetization note in CLAUDE.md.
  account_id   uuid not null references auth.users (id) on delete cascade,

  payer        text        not null default '',
  amount_cents integer     not null check (amount_cents >= 0),
  occurred_on  date,
  memo         text        not null default '',
  source       text        not null check (source in ('screenshot', 'manual')),

  -- Points at the future services catalog (v0.3). Nullable and unconstrained
  -- for now so we don't create a table we haven't designed.
  service_id   uuid,

  -- null = not triaged yet. true = business, false = personal.
  business     boolean,

  created_at   timestamptz not null default now()
);

-- The dashboard reads "my payments, newest first" on every screen.
create index if not exists transactions_account_occurred_idx
  on public.transactions (account_id, occurred_on desc nulls last, created_at desc);

-- Row level security: a row is only ever visible to the account that owns it.
-- Without this, the anon key would read the whole table.
alter table public.transactions enable row level security;

drop policy if exists "own transactions: select" on public.transactions;
create policy "own transactions: select" on public.transactions
  for select using (auth.uid() = account_id);

drop policy if exists "own transactions: insert" on public.transactions;
create policy "own transactions: insert" on public.transactions
  for insert with check (auth.uid() = account_id);

drop policy if exists "own transactions: update" on public.transactions;
create policy "own transactions: update" on public.transactions
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

drop policy if exists "own transactions: delete" on public.transactions;
create policy "own transactions: delete" on public.transactions
  for delete using (auth.uid() = account_id);
