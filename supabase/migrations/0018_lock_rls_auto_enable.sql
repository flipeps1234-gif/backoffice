-- 0018: revoke public EXECUTE on the rls_auto_enable event-trigger
-- helper. The Supabase security advisor flagged it: a SECURITY DEFINER
-- function callable by anon/authenticated via /rest/v1/rpc. Actual
-- exploitability is nil — it reads pg_event_trigger_ddl_commands(),
-- which errors outside a real DDL event trigger — but an anonymous
-- caller has no business executing ANY definer function. Event
-- triggers fire as the function owner regardless of these grants, so
-- the auto-RLS behavior is unchanged.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
