-- Ledger v0.3 — expenses. Money out lives in the same table as money in,
-- distinguished by direction, so history, RLS, and dedupe all come for free.
-- Run in the Supabase SQL editor, after 0002.

alter table public.transactions
  add column if not exists direction text not null default 'in'
  check (direction in ('in', 'out'));
