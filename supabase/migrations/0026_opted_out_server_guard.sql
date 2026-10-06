-- 0026 — opted_out_at is the webhooks' column.
--
-- notification_prefs.opted_out_at records a STOP text (sms/whatsapp webhooks,
-- service role). The web client stopped writing it (2026-10-05): a consent
-- stamp dated after the STOP is the re-opt-in (hasActiveConsent), and a
-- client write that nulled it — parked offline, landing hours later — erased
-- a STOP texted in between. The native app still sends the column, and any
-- client could. Server-side twin: a write by a client role keeps the stored
-- value (NULL on a client's insert — nothing has texted STOP to a row that
-- did not exist). Service role and the SQL editor are untouched.
--
-- Applying: the Supabase MCP apply_migration wraps the run; no begin/commit.
create or replace function public.keep_opted_out_at()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if TG_OP = 'INSERT' then
      new.opted_out_at := null;
    else
      new.opted_out_at := old.opted_out_at;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.keep_opted_out_at() from public, anon, authenticated;
drop trigger if exists keep_opted_out_at on public.notification_prefs;
create trigger keep_opted_out_at
  before insert or update on public.notification_prefs
  for each row execute function public.keep_opted_out_at();
