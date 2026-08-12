-- Ledger v0.5 — recurring templates. Run in the Supabase SQL editor,
-- after 0006.
--
-- EXPECTED REVENUE, NOT SCHEDULING (CLAUDE.md rule): a template's only
-- power is to create an OPEN sale in Owed when due. No times, no
-- reminders, no notifications — and no server-side clock: generation
-- runs client-side on app open, so this table is plain state.

create table if not exists public.recurring_templates (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references auth.users (id) on delete cascade,

  client_id    uuid not null,
  line_items   jsonb not null default '[]'::jsonb,
  -- {"type":"weekly"} | {"type":"biweekly"} | {"type":"monthly"}
  -- | {"type":"everyN","days":n} — validated client-side on load.
  cadence      jsonb not null,
  next_due     date not null,
  active       boolean not null default true,
  -- Instances still OPEN when their successor generated. Reset by any
  -- payment; at 3 the template pauses itself (src/lib/recurring.ts).
  consecutive_misses integer not null default 0
    check (consecutive_misses >= 0),

  created_at   timestamptz not null default now()
);

alter table public.recurring_templates
  drop constraint if exists recurring_templates_client_fkey;
alter table public.recurring_templates
  add constraint recurring_templates_client_fkey
  foreign key (client_id, account_id)
  references public.clients (id, account_id)
  on delete cascade;

-- Now that the table exists, seal the reference 0006 left open.
create unique index if not exists recurring_templates_id_account_key
  on public.recurring_templates (id, account_id);

alter table public.sales
  drop constraint if exists sales_recurring_template_fkey;
alter table public.sales
  add constraint sales_recurring_template_fkey
  foreign key (recurring_template_id, account_id)
  references public.recurring_templates (id, account_id)
  on delete set null (recurring_template_id);

create index if not exists recurring_templates_account_due_idx
  on public.recurring_templates (account_id, active, next_due);

alter table public.recurring_templates enable row level security;

drop policy if exists "own templates: select" on public.recurring_templates;
create policy "own templates: select" on public.recurring_templates
  for select using (auth.uid() = account_id);

drop policy if exists "own templates: insert" on public.recurring_templates;
create policy "own templates: insert" on public.recurring_templates
  for insert with check (auth.uid() = account_id);

drop policy if exists "own templates: update" on public.recurring_templates;
create policy "own templates: update" on public.recurring_templates
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

drop policy if exists "own templates: delete" on public.recurring_templates;
create policy "own templates: delete" on public.recurring_templates
  for delete using (auth.uid() = account_id);
