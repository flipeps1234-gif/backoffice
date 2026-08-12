-- Ledger v0.5.1 — database-level idempotency for recurring instances.
-- Run in the Supabase SQL editor, after 0007.
--
-- Client-side generation checks existingSales before creating, but two
-- devices opening the app in the same minute both pass that check and
-- both insert — duplicate OPEN sales, doubled owed, and no delete
-- anywhere to clean it up. Instance identity is (template, due date);
-- the database now enforces it. Postgres treats NULLs as distinct in
-- unique indexes, so manual sales (recurring_template_id null) are
-- untouched by this constraint.

create unique index if not exists sales_recurring_instance_key
  on public.sales (account_id, recurring_template_id, occurred_on);

-- The generation insert uses ON CONFLICT DO NOTHING against this index
-- (supabase upsert with ignoreDuplicates) — the loser of the race keeps
-- the winner's row and drops its own.
