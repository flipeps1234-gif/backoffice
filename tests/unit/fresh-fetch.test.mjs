import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL('../../src/lib/supabase/fresh-fetch.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: () => { throw new Error('fresh-fetch.ts must stay dependency-free'); }, Headers, Request, Response },
);
const { isExpiredJwtResponse, withFreshToken } = exports;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('isExpiredJwtResponse: PostgREST PGRST301 or a "JWT expired" message on a 401; nothing else', async () => {
  assert.equal(await isExpiredJwtResponse(json(401, { code: 'PGRST301', message: 'JWT expired' })), true);
  assert.equal(await isExpiredJwtResponse(json(401, { message: 'JWT expired' })), true);
  assert.equal(await isExpiredJwtResponse(json(401, { code: 'PGRST302', message: 'Anonymous access is disabled' })), false);   // another 401: not ours
  assert.equal(await isExpiredJwtResponse(json(200, { code: 'PGRST301' })), false);
  assert.equal(await isExpiredJwtResponse(new Response('nope', { status: 401 })), false);                                     // not JSON
});

test('withFreshToken: an expired-JWT 401 is refreshed once and replayed with the new bearer; the body is left readable', async () => {
  const calls = [];
  const base = async (input, init) => {
    calls.push({ url: String(input), auth: new Headers(init?.headers).get('authorization'), body: init?.body });
    return calls.length === 1 ? json(401, { code: 'PGRST301', message: 'JWT expired' }) : json(201, [{ id: 1 }]);
  };
  let refreshes = 0;
  const fetchFresh = withFreshToken(base, async () => { refreshes += 1; return 'new-token'; });
  const res = await fetchFresh('https://x.test/rest/v1/transactions', { method: 'POST', headers: { Authorization: 'Bearer old-token', apikey: 'k' }, body: '{"a":1}' });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), [{ id: 1 }]);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].auth, 'Bearer old-token');
  assert.equal(calls[1].auth, 'Bearer new-token');
  assert.equal(calls[1].body, '{"a":1}');                                   // the same JSON body goes again
});

test('withFreshToken: no refresh on other answers; a failed refresh hands the 401 back (then the queue treats it as a wait)', async () => {
  let refreshes = 0;
  const ok = withFreshToken(async () => json(200, []), async () => { refreshes += 1; return 'x'; });
  assert.equal((await ok('https://x.test/a')).status, 200);
  const other401 = withFreshToken(async () => json(401, { message: 'Anonymous access is disabled' }), async () => { refreshes += 1; return 'x'; });
  assert.equal((await other401('https://x.test/a')).status, 401);
  assert.equal(refreshes, 0);
  let base = 0;
  const cannot = withFreshToken(async () => { base += 1; return json(401, { code: 'PGRST301', message: 'JWT expired' }); }, async () => null);
  const res = await cannot('https://x.test/a', { headers: { Authorization: 'Bearer old' } });
  assert.equal(res.status, 401);
  assert.equal(base, 1);                                                      // nothing replayed without a token
  assert.deepEqual(await res.json(), { code: 'PGRST301', message: 'JWT expired' });   // the body still readable (clone)
});
