-- Ledger — notifications SPIKE (dark). Run after 0013.
--
-- Plumbing only: nothing in production sends anything (WHATSAPP_ENABLED
-- is false there). The tables exist so consent has a timestamped home
-- and sends have a queue with delivery-status logging, exercised against
-- Meta's free test number from a dev machine.
--
-- notification_prefs: one row per account. `phone` is shared by every
-- future channel; consent is PER CHANNEL and timestamped (the checkbox's
-- tick time — proof of opt-in, which WhatsApp policy and common sense
-- both require). opted_out_at records an inbound STOP and wins over
-- consent until the user re-opts-in.

create table if not exists public.notification_prefs (
  account_id          uuid primary key references auth.users (id) on delete cascade,
  -- E.164 as typed ("+15551234567"); validated client-side, never dialed
  -- by anything but the channel APIs.
  phone               text not null default '',
  whatsapp_consent_at timestamptz,
  opted_out_at        timestamptz,
  updated_at          timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "own prefs: select" on public.notification_prefs;
create policy "own prefs: select" on public.notification_prefs
  for select using (auth.uid() = account_id);

drop policy if exists "own prefs: insert" on public.notification_prefs;
create policy "own prefs: insert" on public.notification_prefs
  for insert with check (auth.uid() = account_id);

drop policy if exists "own prefs: update" on public.notification_prefs;
create policy "own prefs: update" on public.notification_prefs
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

-- The queue. Rows are enqueued with status 'queued', flipped by the
-- sender ('sent' / 'failed' / 'skipped'), then by delivery webhooks
-- ('delivered' / 'read' / 'undelivered'). Webhook writes come from
-- Meta, not a user session — they use the service-role key when the
-- server has one, and are log-only when it doesn't (spike posture).

create table if not exists public.notification_queue (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references auth.users (id) on delete cascade,
  event               text not null check (event in
                        ('owed_aging', 'payment_matched', 'monthly_recap')),
  to_number           text not null,
  template            text not null,
  -- Positional template variables, already minimal: first names and
  -- amounts only. No memos, no line items — minimal data in messages.
  variables           jsonb not null default '[]'::jsonb,
  -- For the owed_aging frequency cap: which client this alert is about.
  client_id           uuid,
  status              text not null default 'queued' check (status in
                        ('queued', 'sent', 'delivered', 'read',
                         'undelivered', 'failed', 'skipped')),
  provider_message_id text,
  error               text,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz
);

create index if not exists notification_queue_account_idx
  on public.notification_queue (account_id, created_at desc);
-- The 1-per-client-per-week cap asks "when did this client last get an
-- owed alert" — this index answers it.
create index if not exists notification_queue_cap_idx
  on public.notification_queue (account_id, event, client_id, created_at desc);

alter table public.notification_queue enable row level security;

drop policy if exists "own queue: select" on public.notification_queue;
create policy "own queue: select" on public.notification_queue
  for select using (auth.uid() = account_id);

drop policy if exists "own queue: insert" on public.notification_queue;
create policy "own queue: insert" on public.notification_queue
  for insert with check (auth.uid() = account_id);

drop policy if exists "own queue: update" on public.notification_queue;
create policy "own queue: update" on public.notification_queue
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);
