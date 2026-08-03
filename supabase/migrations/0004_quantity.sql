-- Ledger v0.3 — per-customer memory. Rate-priced jobs record how many
-- units (sqft / hours / rooms), so "Rosa's lawn is 4000 sqft" is remembered
-- from her last job instead of retyped. Run after 0003.

alter table public.transactions
  add column if not exists quantity numeric
  check (quantity is null or quantity > 0);
