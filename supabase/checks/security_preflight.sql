-- Read-only, production SQL editor. Every oversized count must be zero.
-- Reports counts only, never user content, credentials or email addresses.
select 'services' as table_name, count(*) as oversized_rows from public.services where octet_length(name) > 400
union all select 'recurring_templates', count(*) from public.recurring_templates
  where octet_length(line_items::text) > 20000 or octet_length(cadence::text) > 1000
union all select 'business_profiles', count(*) from public.business_profiles
  where octet_length(business_name) > 400 or octet_length(owner_name) > 400 or octet_length(us_state) > 16
union all select 'notification_prefs', count(*) from public.notification_prefs where octet_length(phone) > 32
union all select 'notification_queue', count(*) from public.notification_queue
  where octet_length(to_number) > 32 or octet_length(template) > 200 or octet_length(variables::text) > 8000
     or octet_length(provider_message_id) > 400 or octet_length(error) > 2000;

-- Should show 0019/0020's guard. Confirm live code matches the baseline
-- before CREATE OR REPLACE; preserve any independent production fixes.
select pg_get_functiondef('public.enforce_demo_cap()'::regprocedure);
select jobname, schedule, active from cron.job
  where jobname in ('purge-deleted-accounts', 'reset-demo-rows');

-- Pending deletions are not rewritten by the fix. Investigate unexpected
-- future timestamps without modifying legitimate pending requests.
select count(*) as future_deletion_requests from public.deletion_requests
  where requested_at > now() + interval '1 minute';
