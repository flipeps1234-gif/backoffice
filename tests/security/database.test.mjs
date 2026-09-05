import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const demo = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const migrations = new URL('../../supabase/migrations/', import.meta.url);
async function asUser(id, email) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [id, JSON.stringify({ email })]);
  await db.exec('SET ROLE authenticated');
}
async function resetUsage(overrides = '') {
  await db.exec(`RESET ROLE; DELETE FROM public.extraction_usage;
    UPDATE public.security_limits SET account_images_daily=40,demo_images_daily=10,
      project_images_daily=200,project_images_monthly=1000,account_concurrent=2,project_concurrent=8;
    ${overrides}
    SET ROLE service_role;`);
}
async function reserve(id = user, images = 1) {
  return (await db.query('SELECT public.reserve_extraction($1,$2) AS result', [id, images])).rows[0].result;
}
async function finish(reservation) {
  await db.query('SELECT public.finish_extraction($1)', [reservation.reservation_id]);
}
before(async () => {
  db = new PGlite();
  // Minimal Supabase-style roles and JWT helpers; no credentials/network.
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid primary key, email text, encrypted_password text, phone text, raw_user_meta_data jsonb, created_at timestamptz not null default now(), last_sign_in_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    CREATE FUNCTION public.rls_auto_enable() RETURNS void LANGUAGE sql AS $$ SELECT $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  `);
  for (const file of (await readdir(migrations)).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  }
  await db.query("INSERT INTO auth.users(id,email) VALUES ($1,'tester@demo.dem'),($2,'test@example.invalid'),($3,'other@example.invalid')", [demo,user,other]);
});
after(async () => { await db?.close(); });

test('all demo-cap tables accept ordinary inserts; sales reject photos on insert and update', async () => {
  await asUser(demo, 'tester@demo.dem');
  await db.query("INSERT INTO public.transactions(account_id,payer,amount_cents,source) VALUES ($1,'Review',1,'manual')", [demo]);
  const client = (await db.query("INSERT INTO public.clients(account_id,name) VALUES ($1,'Review') RETURNING id", [demo])).rows[0].id;
  await db.query("INSERT INTO public.services(account_id,name,pricing_type,price_cents) VALUES ($1,'Review','flat',1)", [demo]);
  await db.query("INSERT INTO public.recurring_templates(account_id,client_id,cadence,next_due) VALUES ($1,$2,'{\"type\":\"weekly\"}',current_date)", [demo, client]);
  await db.query("INSERT INTO public.business_profiles(account_id,business_name) VALUES ($1,'Review')", [demo]);
  await db.query("INSERT INTO public.notification_prefs(account_id) VALUES ($1)", [demo]);
  await db.query("INSERT INTO public.notification_queue(account_id,event,to_number,template) VALUES ($1,'monthly_recap','+15550000000','review')", [demo]);
  await db.query("INSERT INTO public.sales(account_id,occurred_on,state) VALUES ($1,current_date,'open')", [demo]);
  await assert.rejects(db.query("INSERT INTO public.sales(account_id,occurred_on,state,photo) VALUES ($1,current_date,'open','data:image/png;base64,AA==')", [demo]), /cannot store photos/);
  await assert.rejects(db.query("UPDATE public.sales SET photo='data:image/png;base64,AA==' WHERE account_id=$1", [demo]), /cannot store photos/);
});

test('existing demo records reject oversized updates, including multibyte text', async () => {
  await asUser(demo, 'tester@demo.dem');
  for (const sql of [
    "UPDATE public.business_profiles SET business_name=repeat('x',2000000)",
    "UPDATE public.business_profiles SET owner_name=repeat('é',201)",
    "UPDATE public.business_profiles SET us_state=repeat('x',17)",
    "UPDATE public.notification_queue SET variables=jsonb_build_array(repeat('x',1000000))",
    "UPDATE public.notification_queue SET error=repeat('x',2001)",
    "UPDATE public.notification_prefs SET phone=repeat('x',33)",
    "UPDATE public.recurring_templates SET cadence=jsonb_build_object('type',repeat('x',1001))",
    "UPDATE public.recurring_templates SET line_items=jsonb_build_array(repeat('x',20001))",
    "UPDATE public.services SET name=repeat('x',401)",
  ]) await assert.rejects(db.exec(sql), e => e.code === '23514');
});

test('demo cap rolls back an entire over-limit batch; other accounts stay isolated', async () => {
  await asUser(demo, 'tester@demo.dem');
  await assert.rejects(db.query("INSERT INTO public.transactions(account_id,amount_cents,source) SELECT $1,1,'manual' FROM generate_series(1,300)", [demo]), /demo cap reached/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.transactions')).rows[0].n, 1);
  await asUser(user, 'test@example.invalid');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.business_profiles')).rows[0].n, 0);
  await assert.rejects(db.query("INSERT INTO public.business_profiles(account_id) VALUES ($1)", [demo]), /row-level security/);
});

test('deletion stamps server time, preserves web/native retries, ignores timestamp updates, allows cancel', async () => {
  await asUser(user, 'test@example.invalid');
  await db.query("INSERT INTO public.deletion_requests(account_id,requested_at) VALUES ($1,now()-interval '8 days')", [user]);
  let row = (await db.query("SELECT requested_at,requested_at < now()-interval '7 days' AS eligible FROM public.deletion_requests")).rows[0];
  assert.equal(row.eligible, false);
  const first = row.requested_at.getTime();
  await db.query("INSERT INTO public.deletion_requests(account_id,requested_at) VALUES ($1,'2099-01-01') ON CONFLICT(account_id) DO NOTHING", [user]);
  row = (await db.query('SELECT requested_at FROM public.deletion_requests')).rows[0];
  assert.equal(row.requested_at.getTime(), first);
  await db.exec("UPDATE public.deletion_requests SET requested_at='2000-01-01'");
  assert.equal((await db.query('SELECT requested_at FROM public.deletion_requests')).rows[0].requested_at.getTime(),first);
  await db.query("INSERT INTO public.deletion_requests(account_id,requested_at) VALUES ($1,'2099-01-01') ON CONFLICT(account_id) DO UPDATE SET account_id=excluded.account_id,requested_at=excluded.requested_at",[user]);
  assert.equal((await db.query('SELECT requested_at FROM public.deletion_requests')).rows[0].requested_at.getTime(),first);
  await db.exec('DELETE FROM public.deletion_requests');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.deletion_requests')).rows[0].n, 0);
  await db.query("INSERT INTO public.deletion_requests(account_id) VALUES ($1) ON CONFLICT(account_id) DO UPDATE SET account_id=excluded.account_id",[user]);
  assert.equal((await db.query("SELECT requested_at < now()-interval '7 days' AS eligible FROM public.deletion_requests")).rows[0].eligible,false);
  await asUser(demo, 'tester@demo.dem');
  await assert.rejects(db.query('INSERT INTO public.deletion_requests(account_id) VALUES ($1)', [demo]), /row-level security/);
});

test('public roles cannot invoke either signup RPC, reserve or finish usage, or access counters', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`RESET ROLE; SET ROLE ${role}`);
    for (const sql of [
      "SELECT public.founding_signup('review@example.invalid')",
      "SELECT public.founding_signup_limited('review@example.invalid',repeat('a',64))",
      `SELECT public.reserve_extraction('${user}',1)`,
      `SELECT public.finish_extraction('${user}')`,
      'SELECT public.cleanup_security_usage()',
      'SELECT * FROM public.security_limits',
      'SELECT * FROM public.extraction_usage',
      'SELECT * FROM public.founding_attempts',
      "INSERT INTO public.founding_list(email) VALUES ('review@example.invalid')",
    ]) await assert.rejects(db.exec(sql), /permission denied/);
  }
});

test('server signup counts duplicates identically and enforces per-IP plus global limits', async () => {
  await db.exec('RESET ROLE; DELETE FROM public.founding_attempts; UPDATE public.security_limits SET founding_ip_hourly=2,founding_project_hourly=3; SET ROLE service_role');
  const signup = async (email, ip) => (await db.query('SELECT public.founding_signup_limited($1,$2) AS ok', [email, ip.repeat(64)])).rows[0].ok;
  assert.equal(await signup('local@example.invalid','a'),true);
  assert.equal(await signup('local@example.invalid','a'),true);
  assert.equal(await signup('another@example.invalid','a'),false);
  assert.equal(await signup('new@example.invalid','b'),true);
  assert.equal(await signup('next@example.invalid','c'),false);
  await assert.rejects(signup('not-an-email','d'), /invalid signup/);
});

test('account limits survive lease release and fresh requests; demo has a separate smaller limit', async () => {
  await resetUsage('UPDATE public.security_limits SET account_images_daily=3,demo_images_daily=1;');
  const first = await reserve(user, 3);
  assert.equal(first.allowed,true);
  await finish(first);
  assert.equal((await reserve()).allowed,false);
  assert.equal((await reserve(demo,2)).allowed,false);
  assert.equal((await reserve(demo,1)).allowed,true);
});

test('per-account and global concurrency hold; completion releases only a lease', async () => {
  await resetUsage('UPDATE public.security_limits SET account_concurrent=1,project_concurrent=2;');
  const first = await reserve();
  assert.equal(first.allowed,true);
  assert.equal((await reserve()).allowed,false);
  assert.equal((await reserve(other)).allowed,true);
  assert.equal((await reserve(demo)).allowed,false);
  await finish(first);
  assert.equal((await reserve()).allowed,true);
});

test('expired leases recover automatically without resetting spent images', async () => {
  await resetUsage('UPDATE public.security_limits SET account_concurrent=1,account_images_daily=2;');
  assert.equal((await reserve()).allowed,true);
  await db.exec("RESET ROLE; UPDATE public.extraction_usage SET lease_until=now()-interval '1 second'; SET ROLE service_role");
  const second = await reserve();
  assert.equal(second.allowed,true);
  await finish(second);
  assert.equal((await reserve()).allowed,false);
});

test('global daily and monthly budgets apply across accounts and survive account deletion', async () => {
  await resetUsage('UPDATE public.security_limits SET project_images_daily=2;');
  const first = await reserve(user,2);
  await finish(first);
  assert.equal((await reserve(other)).allowed,false);
  await resetUsage('UPDATE public.security_limits SET project_images_monthly=2;');
  const second = await reserve(other,2);
  await finish(second);
  await db.exec(`RESET ROLE; DELETE FROM auth.users WHERE id='${other}'; SET ROLE service_role;`);
  assert.equal((await reserve()).allowed,false);
});

test('invalid identities and image counts cannot reserve; rerunning corrective migrations is safe', async () => {
  await resetUsage();
  for (const n of [0,21,null]) await assert.rejects(reserve(user,n), /invalid extraction request/);
  await assert.rejects(reserve(other), /unknown account/);
  await db.exec('RESET ROLE');
  for (const file of ['0021_complete_write_guards.sql','0022_server_usage_limits.sql']) {
    await db.exec(await readFile(new URL(file,migrations),'utf8'));
  }
});

test('security cleanup removes expired counters without deleting current budget usage', async () => {
  await db.exec(`RESET ROLE;
    DELETE FROM public.extraction_usage; DELETE FROM public.founding_attempts;
    INSERT INTO public.extraction_usage(images,created_at) VALUES (1,now()-interval '36 days'),(2,now());
    INSERT INTO public.founding_attempts(ip_hash,created_at) VALUES (repeat('a',64),now()-interval '2 hours'),(repeat('b',64),now());
    SELECT public.cleanup_security_usage();`);
  assert.equal((await db.query('SELECT sum(images)::int AS n FROM public.extraction_usage')).rows[0].n,2);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.founding_attempts')).rows[0].n,1);
});

// ---- 0023 admin_overview: service_role only; totals follow the product laws ----
test('admin_overview is executable by service_role only', async () => {
  await db.exec('RESET ROLE');
  const grants = (await db.query(`SELECT r AS role, has_function_privilege(r, 'public.admin_overview()', 'EXECUTE') AS ok
    FROM unnest(ARRAY['anon','authenticated','service_role']) r`)).rows;
  assert.deepEqual(Object.fromEntries(grants.map(g => [g.role, g.ok])), { anon: false, authenticated: false, service_role: true });
  await asUser(user, 'test@example.invalid');
  await assert.rejects(db.query('SELECT public.admin_overview()'), /permission denied/);
});
test('admin_overview totals: per-line rounding, owed = open only, demo excluded but listed', async () => {
  await db.exec('RESET ROLE; DELETE FROM public.transactions; DELETE FROM public.sales; DELETE FROM public.clients;');
  await asUser(user, 'test@example.invalid');
  await db.query(`INSERT INTO public.transactions(account_id,payer,amount_cents,source,direction,business) VALUES
    ($1,'A',1000,'screenshot','in',true),($1,'B',250,'manual','in',true),($1,'C',400,'manual','out',true),($1,'D',9999,'manual','in',false)`, [user]);
  await db.query(`INSERT INTO public.sales(account_id,occurred_on,line_items,state) VALUES
    ($1,'2026-09-01','[{"unitCents":333,"quantity":1.5,"unitCostCents":null},{"unitCents":100,"quantity":1,"unitCostCents":null}]','open'),
    ($1,'2026-09-01','[{"unitCents":5000,"quantity":1,"unitCostCents":null}]','expected'),
    ($1,'2026-09-01','[{"unitCents":7000,"quantity":1,"unitCostCents":null}]','paid')`, [user]);
  await asUser(demo, 'tester@demo.dem');
  await db.query("INSERT INTO public.transactions(account_id,payer,amount_cents,source,direction,business) VALUES ($1,'demo',123456,'manual','in',true)", [demo]);
  await db.exec('RESET ROLE; SET ROLE service_role');
  const o = (await db.query('SELECT public.admin_overview() AS o')).rows[0].o;
  await db.exec('RESET ROLE');
  assert.equal(Number(o.totals.money_in_cents), 1250);          // business income only; personal 9999 and demo 123456 excluded
  assert.equal(Number(o.totals.money_out_cents), 400);
  assert.equal(Number(o.totals.owed_cents), 600);               // open sale: round(333*1.5)=500 + 100; expected counts as received
  assert.equal(Number(o.totals.sales_open), 1); assert.equal(Number(o.totals.sales_expected), 1); assert.equal(Number(o.totals.sales_paid), 1);
  assert.equal(Number(o.totals.transactions), 4);
  assert.equal(Number(o.totals.transactions_screenshot), 1);
  const realAccounts = Number((await db.query("SELECT count(*) AS n FROM auth.users WHERE split_part(coalesce(email,''),'@',1) <> 'tester'")).rows[0].n);
  assert.equal(Number(o.totals.accounts), realAccounts);        // every non-tester account, however many earlier tests left
  assert.ok(realAccounts >= 1);
  assert.equal(o.weekly.length, 12); assert.equal(o.daily_uploads.length, 30);
  assert.equal(o.weekly.reduce((s, w) => s + Number(w.money_in_cents), 0), 1250);
  const tester = o.accounts.find(a => a.is_tester);
  assert.ok(tester, 'the demo account is listed'); assert.equal(Number(tester.money_in_cents), 123456);
  const me = o.accounts.find(a => a.id === user);
  assert.equal(Number(me.owed_cents), 600); assert.equal(Number(me.transactions), 4); assert.equal(me.lang, 'en');
  for (const a of o.accounts) for (const k of Object.keys(a)) assert.ok(!/payer|memo|notes|photo|name$/.test(k), `no content field leaks: ${k}`);
  assert.ok(Number(o.storage.db_bytes) > 0);
});

