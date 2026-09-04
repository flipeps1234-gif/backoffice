-- Complete the 0020 guards. Apply before the application deployment.
-- Existing oversized records make VALIDATE fail; never truncate user data.
begin;

create or replace function public.enforce_demo_cap()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  row_count bigint;
begin
  if split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1) <> 'tester' then
    return null;
  end if;
  execute format('select count(*) from public.%I', TG_TABLE_NAME) into row_count;
  if row_count > 300 then
    raise exception 'demo cap reached';
  end if;
  -- A boolean AND still plans the column reference on non-sales tables.
  -- A separate statement only resolves ins.photo when ins is a sales row.
  if TG_TABLE_NAME = 'sales' then
    if exists (select 1 from ins where photo is not null) then
      raise exception 'the demo account cannot store photos';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.enforce_demo_cap() from public, anon, authenticated;

-- CHECKs apply equally to INSERT and UPDATE, including existing demo rows.
alter table public.services drop constraint if exists services_name_bytes;
alter table public.services add constraint services_name_bytes
  check (octet_length(name) <= 400) not valid;
alter table public.services validate constraint services_name_bytes;

alter table public.recurring_templates drop constraint if exists recurring_payload_bytes;
alter table public.recurring_templates add constraint recurring_payload_bytes
  check (octet_length(line_items::text) <= 20000 and octet_length(cadence::text) <= 1000) not valid;
alter table public.recurring_templates validate constraint recurring_payload_bytes;

alter table public.business_profiles drop constraint if exists profile_text_bytes;
alter table public.business_profiles add constraint profile_text_bytes
  check (octet_length(business_name) <= 400 and octet_length(owner_name) <= 400
    and octet_length(us_state) <= 16) not valid;
alter table public.business_profiles validate constraint profile_text_bytes;

alter table public.notification_prefs drop constraint if exists notification_phone_bytes;
alter table public.notification_prefs add constraint notification_phone_bytes
  check (octet_length(phone) <= 32) not valid;
alter table public.notification_prefs validate constraint notification_phone_bytes;

alter table public.notification_queue drop constraint if exists notification_payload_bytes;
alter table public.notification_queue add constraint notification_payload_bytes
  check (octet_length(to_number) <= 32 and octet_length(template) <= 200
    and octet_length(variables::text) <= 8000
    and (provider_message_id is null or octet_length(provider_message_id) <= 400)
    and (error is null or octet_length(error) <= 2000)) not valid;
alter table public.notification_queue validate constraint notification_payload_bytes;

-- The caller may request or cancel deletion, never choose its timestamp.
create or replace function public.stamp_deletion_request()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    new.requested_at := statement_timestamp();
  else
    new.requested_at := old.requested_at;
  end if;
  return new;
end;
$$;
revoke all on function public.stamp_deletion_request() from public, anon, authenticated;
drop trigger if exists stamp_deletion_request on public.deletion_requests;
create trigger stamp_deletion_request
  before insert or update on public.deletion_requests
  for each row execute function public.stamp_deletion_request();
drop policy if exists "own deletion: update" on public.deletion_requests;
-- Existing native versions use ON CONFLICT DO UPDATE, even on their
-- first request. Preserve that permission; the trigger makes timestamp
-- changes a no-op on the conflict arm and on direct PATCH requests.
create policy "own deletion: update" on public.deletion_requests
  for update using (auth.uid() = account_id)
  with check (auth.uid() = account_id);
revoke update on public.deletion_requests from anon;
grant update on public.deletion_requests to authenticated;

commit;
