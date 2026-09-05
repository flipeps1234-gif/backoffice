-- 0023: the owner's analytics view (/app/admin).
--
-- One read-only SECURITY DEFINER function, executable by service_role
-- only. /api/admin/overview calls it after the caller's session email
-- matched OWNER_EMAILS; RLS keeps every client key blind to it. It returns
-- aggregates plus one row per account — email, dates, counts, money —
-- and never memos, payers, customer names, notes or photos.
--
-- Product laws it follows: integer cents; a sale's total is the sum of
-- round(unitCents × quantity) per line (src/lib/sale.ts); EXPECTED counts
-- as received, so "owed" is OPEN sales only; the shared tester account is
-- listed (flagged) but excluded from every product-wide total.
begin;

create or replace function public.admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with accounts as (
  select u.id, u.email, u.created_at, u.last_sign_in_at,
         coalesce(u.raw_user_meta_data ->> 'lang', 'en') as lang,
         split_part(coalesce(u.email, ''), '@', 1) = 'tester' as is_tester
  from auth.users u
),
tx as (
  select t.account_id, t.amount_cents, t.direction, t.business, t.source, t.created_at
  from public.transactions t
),
sale_totals as (
  select s.id, s.account_id, s.state, s.created_at,
         coalesce((select sum(round((li ->> 'unitCents')::numeric * (li ->> 'quantity')::numeric))
                   from jsonb_array_elements(s.line_items) li), 0)::bigint as total_cents
  from public.sales s
),
per_account as (
  select a.id, a.email, a.created_at, a.last_sign_in_at, a.lang, a.is_tester,
         (select count(*) from tx where tx.account_id = a.id) as transactions,
         (select coalesce(sum(amount_cents), 0) from tx
            where tx.account_id = a.id and tx.business and tx.direction = 'in') as money_in_cents,
         (select coalesce(sum(amount_cents), 0) from tx
            where tx.account_id = a.id and tx.business and tx.direction = 'out') as money_out_cents,
         (select count(*) from sale_totals st where st.account_id = a.id) as sales,
         (select coalesce(sum(total_cents), 0) from sale_totals st
            where st.account_id = a.id and st.state = 'open') as owed_cents,
         (select count(*) from public.clients c where c.account_id = a.id) as clients,
         (select count(*) from public.recurring_templates r
            where r.account_id = a.id and r.active) as recurring_active,
         (select count(*) from public.extraction_usage e
            where e.account_id = a.id and e.created_at >= now() - interval '30 days') as uploads_30d,
         greatest(
           (select max(created_at) from tx where tx.account_id = a.id),
           (select max(created_at) from sale_totals st where st.account_id = a.id),
           (select max(created_at) from public.clients c where c.account_id = a.id)
         ) as last_activity_at,
         (select d.requested_at from public.deletion_requests d where d.account_id = a.id) as deletion_requested_at,
         exists (select 1 from public.business_profiles b where b.account_id = a.id) as has_profile
  from accounts a
),
real_accounts as (select * from per_account where not is_tester),
weeks as (
  select generate_series(date_trunc('week', now()) - interval '11 weeks',
                         date_trunc('week', now()), interval '1 week') as week_start
),
days as (
  select generate_series(date_trunc('day', now()) - interval '29 days',
                         date_trunc('day', now()), interval '1 day') as day_start
)
select jsonb_build_object(
  'generated_at', now(),
  'totals', jsonb_build_object(
    'accounts', (select count(*) from real_accounts),
    'active_7d', (select count(*) from real_accounts
                   where greatest(last_activity_at, last_sign_in_at) >= now() - interval '7 days'),
    'active_30d', (select count(*) from real_accounts
                    where greatest(last_activity_at, last_sign_in_at) >= now() - interval '30 days'),
    'new_30d', (select count(*) from real_accounts where created_at >= now() - interval '30 days'),
    'money_in_cents', (select coalesce(sum(money_in_cents), 0) from real_accounts),
    'money_out_cents', (select coalesce(sum(money_out_cents), 0) from real_accounts),
    'owed_cents', (select coalesce(sum(owed_cents), 0) from real_accounts),
    'transactions', (select count(*) from tx join real_accounts ra on ra.id = tx.account_id),
    'transactions_screenshot', (select count(*) from tx join real_accounts ra on ra.id = tx.account_id
                                 where tx.source = 'screenshot'),
    'transactions_manual', (select count(*) from tx join real_accounts ra on ra.id = tx.account_id
                             where tx.source = 'manual'),
    'sales', (select count(*) from sale_totals st join real_accounts ra on ra.id = st.account_id),
    'sales_paid', (select count(*) from sale_totals st join real_accounts ra on ra.id = st.account_id
                    where st.state = 'paid'),
    'sales_open', (select count(*) from sale_totals st join real_accounts ra on ra.id = st.account_id
                    where st.state = 'open'),
    'sales_expected', (select count(*) from sale_totals st join real_accounts ra on ra.id = st.account_id
                        where st.state = 'expected'),
    'clients', (select coalesce(sum(clients), 0) from real_accounts),
    'recurring_active', (select coalesce(sum(recurring_active), 0) from real_accounts),
    'founding_signups', (select count(*) from public.founding_list),
    'uploads_30d', (select count(*) from public.extraction_usage e join real_accounts ra on ra.id = e.account_id
                     where e.created_at >= now() - interval '30 days'),
    'images_30d', (select coalesce(sum(e.images), 0) from public.extraction_usage e
                    join real_accounts ra on ra.id = e.account_id
                    where e.created_at >= now() - interval '30 days'),
    'demo_images_30d', (select coalesce(sum(e.images), 0) from public.extraction_usage e
                         join per_account pa on pa.id = e.account_id
                         where pa.is_tester and e.created_at >= now() - interval '30 days'),
    'deletion_pending', (select count(*) from real_accounts where deletion_requested_at is not null),
    'profiles', (select count(*) from real_accounts where has_profile)
  ),
  'weekly', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'week', to_char(w.week_start, 'YYYY-MM-DD'),
      'new_accounts', (select count(*) from real_accounts ra
                        where ra.created_at >= w.week_start and ra.created_at < w.week_start + interval '1 week'),
      'transactions', (select count(*) from tx join real_accounts ra on ra.id = tx.account_id
                        where tx.created_at >= w.week_start and tx.created_at < w.week_start + interval '1 week'),
      'money_in_cents', (select coalesce(sum(tx.amount_cents), 0) from tx join real_accounts ra on ra.id = tx.account_id
                          where tx.business and tx.direction = 'in'
                            and tx.created_at >= w.week_start and tx.created_at < w.week_start + interval '1 week')
    ) order by w.week_start), '[]'::jsonb)
    from weeks w
  ),
  'daily_uploads', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'day', to_char(d.day_start, 'YYYY-MM-DD'),
      'uploads', (select count(*) from public.extraction_usage e
                   where e.created_at >= d.day_start and e.created_at < d.day_start + interval '1 day'),
      'images', (select coalesce(sum(e.images), 0) from public.extraction_usage e
                  where e.created_at >= d.day_start and e.created_at < d.day_start + interval '1 day')
    ) order by d.day_start), '[]'::jsonb)
    from days d
  ),
  'languages', (
    select coalesce(jsonb_agg(jsonb_build_object('lang', l.lang, 'accounts', l.n) order by l.n desc, l.lang), '[]'::jsonb)
    from (select lang, count(*) as n from real_accounts group by lang) l
  ),
  'accounts', (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.last_activity_at desc nulls last, p.created_at desc), '[]'::jsonb)
    from per_account p
  ),
  'storage', jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object('name', c.relname, 'bytes', pg_total_relation_size(c.oid))
                                order by pg_total_relation_size(c.oid) desc), '[]'::jsonb)
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    )
  )
);
$$;

revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to service_role;

commit;
