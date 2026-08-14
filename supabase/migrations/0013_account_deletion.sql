-- Ledger v0.6.7 — account deletion with a 7-day purge. Run after 0012.
--
-- The app's terms promised "no delete" since v0.1; this closes that.
-- Deleting is a REQUEST with a 7-day cooling-off window the owner can
-- cancel from Settings. The purge itself deletes the auth.users row;
-- every app table references it ON DELETE CASCADE, so one delete
-- erases the account's transactions, services, clients, sales,
-- templates, profile — and the request row itself.

create table if not exists public.deletion_requests (
  account_id   uuid primary key references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now()
);

alter table public.deletion_requests enable row level security;

drop policy if exists "own deletion: select" on public.deletion_requests;
create policy "own deletion: select" on public.deletion_requests
  for select using (auth.uid() = account_id);

drop policy if exists "own deletion: insert" on public.deletion_requests;
create policy "own deletion: insert" on public.deletion_requests
  for insert with check (auth.uid() = account_id);

-- Cancelling = deleting your own request inside the window.
drop policy if exists "own deletion: delete" on public.deletion_requests;
create policy "own deletion: delete" on public.deletion_requests
  for delete using (auth.uid() = account_id);

-- The purge. SECURITY DEFINER because deleting from auth.users needs
-- rights the client never has; the WHERE clause is the entire policy.
create or replace function public.purge_due_deletions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users u
  using public.deletion_requests r
  where u.id = r.account_id
    and r.requested_at < now() - interval '7 days';
end;
$$;

-- Revoke public execute — only the cron job (postgres) runs it.
revoke execute on function public.purge_due_deletions() from public, anon, authenticated;

-- Nightly purge via pg_cron where available (Supabase has it; a local
-- stack may not — the guard keeps this file one-paste safe). If the
-- extension is missing, deletion requests still record and cascade on
-- whatever later runs the function; nothing breaks silently visible.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'purge-deleted-accounts',
      '17 3 * * *',
      'select public.purge_due_deletions()'
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end;
$$;
