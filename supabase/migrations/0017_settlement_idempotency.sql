-- 0017: settlement idempotency — "one payment, one sale", now enforced
-- by the database. A stale second device could settle an already-settled
-- sale and mint a second linked payment row (permanent doubled revenue
-- in every total and the tax CSV); the client guards all read in-memory
-- state, which can be hours old. Same treatment recurring instances got
-- in 0008. NULLs stay distinct, so unlinked rows are unlimited; a SECOND
-- transaction claiming the same sale fails with 23505, which the app
-- treats as "settled elsewhere", not an error.
--
-- If this CREATE fails with "could not create unique index", the table
-- already holds a doubled settlement from a past race. Find it with:
--   select matched_sale_id, array_agg(id)
--   from public.transactions
--   where matched_sale_id is not null
--   group by matched_sale_id having count(*) > 1;
-- then keep the ingested row (source <> 'manual') and delete the manual
-- mirror before re-running this file.
create unique index if not exists transactions_matched_sale_key
  on public.transactions (matched_sale_id);
