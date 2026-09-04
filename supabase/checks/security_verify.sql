-- Read-only, run after 0021 + 0022. Public client grants must all be false.
select role_name, signature,
  has_function_privilege(role_name, signature, 'EXECUTE') as may_execute
from (values ('anon'), ('authenticated')) roles(role_name)
cross join (values
  ('public.founding_signup(text)'),
  ('public.founding_signup_limited(text,text)'),
  ('public.reserve_extraction(uuid,integer)'),
  ('public.finish_extraction(uuid)'),
  ('public.cleanup_security_usage()')
) functions(signature);

-- These must all be true for the server role.
select signature, has_function_privilege('service_role', signature, 'EXECUTE') as server_may_execute
from (values ('public.founding_signup_limited(text,text)'),
  ('public.reserve_extraction(uuid,integer)'), ('public.finish_extraction(uuid)')) functions(signature);

select has_table_privilege('anon','public.founding_list','INSERT') as anon_insert; -- false
-- UPDATE stays available for existing native upserts; the trigger pins time.
select has_table_privilege('authenticated','public.deletion_requests','UPDATE') as native_upsert_compatible; -- true

select conname, convalidated from pg_constraint
where conname in ('services_name_bytes','recurring_payload_bytes','profile_text_bytes',
  'notification_phone_bytes','notification_payload_bytes');

select * from public.security_limits;
select jobname, schedule, active from cron.job
  where jobname in ('purge-deleted-accounts','reset-demo-rows','cleanup-security-usage');

select pg_get_functiondef('public.enforce_demo_cap()'::regprocedure);
select pg_get_functiondef('public.stamp_deletion_request()'::regprocedure);
