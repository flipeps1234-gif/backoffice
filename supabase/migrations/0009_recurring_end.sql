-- Ledger v0.5 follow-up — explicit template END. Run after 0008.
--
-- Ending is distinct from pausing: pause is reversible ("slow month,
-- skip a while"), end is the owner saying this arrangement is over.
-- The row STAYS — sales.recurring_template_id points at it, and the
-- app deletes nothing by design. An ended template generates no
-- instances and offers no resume (src/lib/recurring.ts checks this
-- column independently of `active`, so a stale active=true can't
-- reanimate it).

alter table public.recurring_templates
  add column if not exists ended_on date;
