import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const load = (globals = {}) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL('../../src/lib/save-retry.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: () => { throw new Error('save-retry.ts must stay dependency-free'); }, ...globals },
  );
  return exports;
};
const { isNetworkSaveError, retryDelayMs } = load();

/** A localStorage with the real API surface the helpers use (length/key). */
const fakeStorage = () => {
  const store = new Map();
  return {
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    _store: store,
  };
};
const blockedStorage = {
  get length() { throw new Error('blocked'); },
  key() { throw new Error('blocked'); },
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};

test('"JWT expired" (PostgREST PGRST301) is a wait: it escapes the client\'s refresh-and-replay only when the refresh itself failed', () => {
  assert.equal(isNetworkSaveError(new Error('JWT expired')), true);
  assert.equal(isNetworkSaveError({ message: 'permission denied for table sales' }), false);
});

test('a refresh another tab\'s refresh discarded (auth-js 2.111 AuthRefreshDiscardedError) is retried, not dropped', () => {
  assert.equal(isNetworkSaveError({ name: 'AuthRefreshDiscardedError', message: 'Refresh result discarded: session state changed mid-flight (e.g., concurrent signOut)' }), true);
  assert.equal(isNetworkSaveError({ name: 'AuthApiError', message: 'Refresh result discarded' }), false);   // the name, not the words
});

test('parked markers: another tab\'s fresh marker is seen, its own is not, stale ones are dropped on read', () => {
  const localStorage = fakeStorage();
  const { markParked, clearParked, otherTabParked, PARKED_STALE_MS } = load({ localStorage });
  const t0 = 1_000_000;
  assert.equal(otherTabParked('me', t0), false);
  markParked('me', t0);
  assert.equal(otherTabParked('me', t0), false);                       // my own park is not "another tab"
  markParked('other', t0);
  assert.equal(otherTabParked('me', t0 + 1000), true);
  assert.equal(otherTabParked('me', t0 + PARKED_STALE_MS + 1), false); // the other tab went quiet: gone
  assert.equal(localStorage.getItem('contado.saveParked.other'), null); // and its marker was dropped
  assert.equal(localStorage.getItem('contado.saveParked.me'), String(t0)); // mine untouched
  localStorage.setItem('contado.saveParked.junk', 'not-a-number');
  assert.equal(otherTabParked('me', t0), false);
  assert.equal(localStorage.getItem('contado.saveParked.junk'), null);
  clearParked('me');
  assert.equal(localStorage.length, 0);
});

test('lost-writes note: per account, said once, survives in memory when storage is blocked', () => {
  const localStorage = fakeStorage();
  const a = load({ localStorage });
  assert.equal(a.takeLostWrites('acct-1'), false);
  a.noteLostWrites('acct-1');
  assert.equal(a.takeLostWrites('acct-2'), false);                     // another account's mount: nothing
  assert.equal(localStorage.getItem('contado.lostWrites.acct-1'), '1');
  const b = load({ localStorage });                                     // a fresh page load (new module state)
  assert.equal(b.takeLostWrites('acct-1'), true);
  assert.equal(b.takeLostWrites('acct-1'), false);                     // once
  const c = load({ localStorage: blockedStorage });
  assert.doesNotThrow(() => c.noteLostWrites('acct-3'));
  assert.equal(c.takeLostWrites('acct-3'), true);
  assert.equal(c.takeLostWrites('acct-3'), false);
  assert.doesNotThrow(() => c.markParked('t'));
  assert.equal(c.otherTabParked('t'), false);
});

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
    // ('JWT expired' moved to the retried side on 2026-10-06: it escapes the refresh-and-replay only when the refresh failed.)
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
