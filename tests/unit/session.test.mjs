import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL('../../src/lib/supabase/session.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: () => { throw new Error('session.ts must stay dependency-free at runtime'); } },
);
const { readSession, isDiscardedRefresh } = exports;

const discarded = { name: 'AuthRefreshDiscardedError', message: 'Refresh result discarded: session state changed mid-flight', status: 409 };
const retryable = { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 };
const session = { access_token: 't2', user: { id: 'u' } };
/** An auth whose getSession answers from a script, counting calls. */
const scripted = (answers) => {
  let calls = 0;
  return { calls: () => calls, getSession: async () => { calls += 1; return answers[Math.min(calls, answers.length) - 1]; } };
};

test('a plain read is one call, whatever it answers', async () => {
  for (const answer of [{ data: { session }, error: null }, { data: { session: null }, error: null }, { data: { session: null }, error: retryable }]) {
    const auth = scripted([answer]);
    assert.deepEqual(await readSession(auth), answer);
    assert.equal(auth.calls(), 1);
  }
});

test('a discarded refresh is read again: the rotated session is in storage (two tabs refreshing together)', async () => {
  const auth = scripted([{ data: { session: null }, error: discarded }, { data: { session }, error: null }]);
  assert.deepEqual(await readSession(auth), { data: { session }, error: null });
  assert.equal(auth.calls(), 2);
});

test('discarded because a concurrent sign-out cleared storage: the re-read answers "no session, no error" — the quiet path', async () => {
  const auth = scripted([{ data: { session: null }, error: discarded }, { data: { session: null }, error: null }]);
  assert.deepEqual(await readSession(auth), { data: { session: null }, error: null });
  assert.equal(auth.calls(), 2);
});

test('bounded: after two re-reads the discard stands (and parks via isNetworkSaveError, never drops)', async () => {
  const auth = scripted([{ data: { session: null }, error: discarded }]);
  const res = await readSession(auth);
  assert.equal(res.error, discarded);
  assert.equal(auth.calls(), 3);
});

test('isDiscardedRefresh goes by the name, as auth-js does', () => {
  assert.equal(isDiscardedRefresh(discarded), true);
  assert.equal(isDiscardedRefresh(retryable), false);
  assert.equal(isDiscardedRefresh(null), false);
  assert.equal(isDiscardedRefresh('AuthRefreshDiscardedError'), false);
});
