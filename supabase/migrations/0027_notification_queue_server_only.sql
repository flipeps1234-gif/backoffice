-- 0027 — notification_queue is written by the server only.
--
-- 0014 let every signed-in account INSERT and UPDATE its own delivery-log
-- rows, addressed to any phone number, though no client ever writes the
-- queue: the server (service role) enqueues and the webhooks update status.
-- A client could forge delivery records or, once sending is live, enqueue a
-- message to a number it does not own (pass-9 authz review). Reading stays
-- (the app may show its own notification history); writing goes.
--
-- Applying: the Supabase MCP apply_migration wraps the run; no begin/commit.
drop policy if exists "own queue: insert" on public.notification_queue;
drop policy if exists "own queue: update" on public.notification_queue;
revoke insert, update, delete on public.notification_queue from anon, authenticated;
