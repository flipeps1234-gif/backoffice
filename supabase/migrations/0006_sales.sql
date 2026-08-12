-- Ledger v0.5 — sales, and the matched_sale_id back-reference on
-- transactions. Run in the Supabase SQL editor, after 0005.
--
-- Money inside line_items jsonb is integer cents, validated client-side
-- on every load (src/lib/sale.ts validateLineItems) — jsonb has no CHECK
-- worth writing for a nested array, so the validation posture is the
-- same as extraction: trust nothing that crosses a boundary.

create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references auth.users (id) on delete cascade,

  -- Composite reference so a sale cannot point at another account's
  -- client (see clients_id_account_key in 0005). Nullable: a sale may
  -- be logged before the client is saved.
  client_id     uuid,
  occurred_on   date not null,
  line_items    jsonb not null default '[]'::jsonb,
  state         text not null check (state in ('open', 'expected', 'paid')),
  method        text     check (method in ('cash', 'digital')),
  matched_txn_id uuid,

  -- Points at recurring_templates, which 0007 creates — unconstrained
  -- until then, same bootstrapping pattern service_id used in 0001.
  recurring_template_id uuid,

  created_at    timestamptz not null default now()
);

alter table public.sales
  drop constraint if exists sales_client_fkey;
alter table public.sales
  add constraint sales_client_fkey
  foreign key (client_id, account_id)
  references public.clients (id, account_id)
  on delete set null (client_id);

-- The Owed tab reads "my open sales, newest first"; matching scans the
-- same set. One index serves both.
create index if not exists sales_account_state_idx
  on public.sales (account_id, state, occurred_on desc);

alter table public.sales enable row level security;

drop policy if exists "own sales: select" on public.sales;
create policy "own sales: select" on public.sales
  for select using (auth.uid() = account_id);

drop policy if exists "own sales: insert" on public.sales;
create policy "own sales: insert" on public.sales
  for insert with check (auth.uid() = account_id);

drop policy if exists "own sales: update" on public.sales;
create policy "own sales: update" on public.sales
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

drop policy if exists "own sales: delete" on public.sales;
create policy "own sales: delete" on public.sales
  for delete using (auth.uid() = account_id);

-- "One payment, one sale": the transaction side of a link.
alter table public.transactions
  add column if not exists matched_sale_id uuid;

-- ---------------------------------------------------------------------
-- Migrate existing manual BUSINESS income logs into sales (PAID, cash),
-- linked both ways so nothing is counted twice: the transaction carries
-- matched_sale_id, the sale carries matched_txn_id. Personal rows and
-- expenses stay plain transactions; screenshot rows are payments, not
-- sales, until the matching engine says otherwise.
--
-- Idempotent: the WHERE clause skips rows that already have a link, so
-- re-running the file cannot duplicate sales.
-- ---------------------------------------------------------------------
with migrated as (
  insert into public.sales
    (account_id, client_id, occurred_on, line_items, state, method,
     matched_txn_id)
  select
    t.account_id,
    null,
    coalesce(t.occurred_on, t.created_at::date),
    -- One line, quantity 1, unit price = the total. unitCents × quantity
    -- must reproduce amount_cents EXACTLY; splitting a rate-priced total
    -- back into per-unit pricing risks rounding drift, and the total is
    -- the truth. The original quantity survives on the transaction row
    -- for customer memory.
    jsonb_build_array(jsonb_build_object(
      'serviceId', t.service_id,
      'name',      coalesce(nullif(t.memo, ''), 'Logged payment'),
      'quantity',  1,
      'unitCents', t.amount_cents,
      'unitCostCents', null
    )),
    'paid',
    'cash',
    t.id
  from public.transactions t
  where t.source = 'manual'
    and t.direction = 'in'
    and t.business = true
    and t.matched_sale_id is null
  returning id, matched_txn_id
)
update public.transactions t
   set matched_sale_id = m.id
  from migrated m
 where t.id = m.matched_txn_id;

