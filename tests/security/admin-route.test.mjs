import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Same loader shape as routes.test.mjs: the real route module, transpiled, with every import stubbed.
function load(file, imports, env = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: id => { if (!(id in imports)) throw new Error(`Unstubbed import: ${id}`); return imports[id]; },
    process: { env: { NODE_ENV: 'production', ...env } },
    Request, Response, Headers, console: { error() {}, warn() {}, log() {} },
  });
  return exports;
}
const owner = { accountId: '22222222-2222-4222-8222-222222222222', email: 'Owner@Example.invalid' };
const stranger = { accountId: '33333333-3333-4333-8333-333333333333', email: 'someone@example.invalid' };
const tester = { accountId: '11111111-1111-4111-8111-111111111111', email: 'tester@demo.dem' };
function route(options = {}) {
  const calls = { rpc: [] };
  const imports = {
    '@/lib/supabase/server': {
      isDemoAccount: email => email === 'tester@demo.dem',
      verifyAccessToken: async token => ({ owner, stranger, tester })[token] ?? null,
    },
    '@/lib/supabase/security': {
      securityClient: () => options.noKey ? null : ({
        rpc: async name => { calls.rpc.push(name); return options.rpc ? options.rpc() : { data: { totals: { accounts: 1 }, accounts: [] }, error: null }; },
      }),
    },
  };
  return { calls, GET: load('src/app/api/admin/overview/route.ts', imports, options.env ?? { OWNER_EMAILS: 'owner@example.invalid, second@example.invalid' }).GET };
}
const get = token => new Request('http://local.test/api/admin/overview', { headers: token ? { authorization: `Bearer ${token}` } : {} });

test('no or invalid token → 401 before any config or database work', async () => {
  const { GET, calls } = route({ noKey: true, env: {} });
  assert.equal((await GET(get())).status, 401);
  assert.equal((await GET(get('nope'))).status, 401);
  assert.equal(calls.rpc.length, 0);
});
test('unconfigured (no OWNER_EMAILS or no server key) → 503 for every signed-in caller, no RPC', async () => {
  for (const options of [{ env: {} }, { noKey: true }]) {
    const { GET, calls } = route(options);
    assert.equal((await GET(get('owner'))).status, 503);
    assert.equal((await GET(get('stranger'))).status, 503);
    assert.equal(calls.rpc.length, 0);
  }
});
test('signed-in non-owner and the demo account → 403; the RPC is never called', async () => {
  const { GET, calls } = route({ env: { OWNER_EMAILS: 'owner@example.invalid,tester@demo.dem' } });
  assert.equal((await GET(get('stranger'))).status, 403);
  assert.equal((await GET(get('tester'))).status, 403, 'listing the demo address must not make it the owner');
  assert.equal(calls.rpc.length, 0);
});
test('the owner (case-insensitive, any separator) gets the RPC payload, uncached', async () => {
  for (const list of ['OWNER@EXAMPLE.INVALID', 'a@b.c; owner@example.invalid', 'owner@example.invalid\nx@y.z']) {
    const { GET, calls } = route({ env: { OWNER_EMAILS: list } });
    const r = await GET(get('owner'));
    assert.equal(r.status, 200);
    assert.deepEqual(calls.rpc, ['admin_overview']);
    assert.match(r.headers.get('cache-control'), /no-store/);
    assert.equal((await r.json()).totals.accounts, 1);
  }
});
test('a failed or empty RPC (stale migration) → 503 without echoing the error', async () => {
  const { GET } = route({ rpc: () => ({ data: null, error: { code: 'PGRST202', message: 'function public.admin_overview() does not exist' } }) });
  const r = await GET(get('owner'));
  assert.equal(r.status, 503);
  assert.doesNotMatch(await r.text(), /admin_overview|PGRST/);
});
