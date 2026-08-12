-- Ledger v0.5 — clients. Run in the Supabase SQL editor, after 0004.
--
-- Thin on purpose: a client is a name plus notes. "Their usual" stays
-- derived from sales history, not stored here — a second copy drifts.

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

-- One name per account, case-insensitively — "rosa delgado" and
-- "Rosa Delgado" are the same person, and the self-building save-client
-- prompt must not manufacture duplicates.
create unique index if not exists clients_account_name_key
  on public.clients (account_id, lower(name));

-- Same cross-tenant sealing pattern as services (0002): lets other
-- tables reference (id, account_id) so a foreign key cannot point at
-- another account's client.
create unique index if not exists clients_id_account_key
  on public.clients (id, account_id);

alter table public.clients enable row level security;

drop policy if exists "own clients: select" on public.clients;
create policy "own clients: select" on public.clients
  for select using (auth.uid() = account_id);

drop policy if exists "own clients: insert" on public.clients;
create policy "own clients: insert" on public.clients
  for insert with check (auth.uid() = account_id);

drop policy if exists "own clients: update" on public.clients;
create policy "own clients: update" on public.clients
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

drop policy if exists "own clients: delete" on public.clients;
create policy "own clients: delete" on public.clients
  for delete using (auth.uid() = account_id);
