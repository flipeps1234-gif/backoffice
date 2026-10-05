import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL('../../src/lib/save-retry.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: () => { throw new Error('save-retry.ts must stay dependency-free'); } },
);
const { isNetworkSaveError, retryDelayMs } = exports;

test('a save that never reached the server is retried: every browser spelling, and the auth refresh failing offline', () => {
  for (const message of [
    'TypeError: Failed to fetch',                                        // Chrome, via postgrest-js
    'TypeError: Load failed',                                            // Safari
    'TypeError: NetworkError when attempting to fetch resource.',        // Firefox
    'TypeError: Network request failed',
    'TypeError: The network connection was lost.',
    'TypeError: The Internet connection appears to be offline.',
    'AbortError: signal is aborted without reason',
  ]) {
    assert.equal(isNetworkSaveError(new Error(message)), true, message);
    assert.equal(isNetworkSaveError({ message, code: '' }), true, `plain object: ${message}`);
  }
  const auth = Object.assign(new Error('whatever auth-js says'), { name: 'AuthRetryableFetchError', status: 0 });
  assert.equal(isNetworkSaveError(auth), true);
});

test('a save the server answered and refused is NOT retried', () => {
  for (const cause of [
    new Error('duplicate key value violates unique constraint "clients_account_name_key"'),
    new Error('new row violates row-level security policy for table "sales"'),
    new Error('insert or update on table "transactions" violates foreign key constraint'),
    new Error('JWT expired'),
    { code: '23505', message: 'duplicate key value violates unique constraint "transactions_pkey"' },
    Object.assign(new Error('Invalid Refresh Token'), { name: 'AuthApiError', status: 400 }),
    new Error(''), null, undefined, 'Failed to fetch', 42,
  ]) {
    assert.equal(isNetworkSaveError(cause), false, String(cause?.message ?? cause));
  }
});

test('the backoff is short first, then 30 s for as long as the page stays open', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 50].map(retryDelayMs), [2000, 5000, 15000, 30000, 30000, 30000]);
  assert.equal(retryDelayMs(-1), 2000);
});
