-- Ledger v0.6.5 — the tax-story columns. Run after 0010.
--
-- clients.distance_tenths: round-trip distance per visit, integer
-- TENTHS of a mile (same integer philosophy as cents). Typed once by
-- the owner; a logged sale counts as a visit. Never GPS.
--
-- transactions.category: Schedule-C-grade label on expense rows, one
-- of the ids in src/lib/category.ts. A label, not tax logic — the tax
-- CSV maps it to the Schedule C line name for the preparer.

alter table public.clients
  add column if not exists distance_tenths integer
    check (distance_tenths is null or distance_tenths >= 0);

alter table public.transactions
  add column if not exists category text;
