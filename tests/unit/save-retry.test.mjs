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
const { isNetworkSaveError, retryDelayMs, isDailyLimitSaveError, classifySaveError, limitResetsAt, limitRetryDelayMs, PARKED_STALE_MS, PARKED_RESTAMP_MS } = load();

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

// ---- The daily write ceiling (migration 0035): a wait, never a refusal ----

/** What 0035 raises: the SQLSTATE PostgREST turns into HTTP 429, and the message. */
const migration = readFileSync(new URL('../../supabase/migrations/0035_account_write_budget.sql', import.meta.url), 'utf8');
const raised = migration.match(/raise exception '([^']+)'\s+using errcode = '([A-Z0-9]{5})'/g)
  .map((s) => s.match(/raise exception '([^']+)'\s+using errcode = '([A-Z0-9]{5})'/))
  .find(([, , code]) => code === 'PT429');

test('0035\'s refusal is what the queue parks on: its exact message (as the wrappers rethrow it) and its code', () => {
  assert.ok(raised, '0035 raises PT429');
  const [, message, code] = raised;
  assert.equal(code, 'PT429');                                                   // PostgREST: HTTP 429
  assert.equal(classifySaveError(new Error(message)), 'limit');                  // `new Error(error.message)` in lib/supabase/*
  assert.equal(classifySaveError({ message, code, details: 'At most 3000 new rows per account per UTC day.' }), 'limit'); // the raw PostgrestError
  assert.equal(classifySaveError(Object.assign(new Error(message), { code })), 'limit'); // insertTransactions keeps the code
  assert.equal(classifySaveError({ code: 'PT429', message: '' }), 'limit');      // the code alone is enough
  assert.equal(isDailyLimitSaveError(new Error(message)), true);
  assert.equal(isNetworkSaveError(new Error(message)), false);                   // an older reading of it would have been "refused"
});

test('classifySaveError: network waits, the ceiling waits, everything else the server answered is refused for good', () => {
  for (const message of ['TypeError: Failed to fetch', 'TypeError: Load failed', 'JWT expired', 'AbortError: signal is aborted without reason']) {
    assert.equal(classifySaveError(new Error(message)), 'network', message);
  }
  assert.equal(classifySaveError(Object.assign(new Error('x'), { name: 'AuthRetryableFetchError' })), 'network');
  for (const cause of [
    new Error('duplicate key value violates unique constraint "sales_pkey"'),
    { code: '23505', message: 'duplicate key value violates unique constraint "transactions_pkey"' },
    new Error('new row violates row-level security policy for table "sales"'),
    new Error('demo cap reached'),
    { code: '429', message: 'Too many requests' },                              // not 0035's answer
    { code: 'PT402', message: 'Payment Required' },
    new Error(''), null, undefined, 'daily write limit reached for this account', 42,
  ]) {
    assert.equal(classifySaveError(cause), 'refused', String(cause?.message ?? cause));
  }
});

test('the ceiling\'s wait: until a minute past the next UTC midnight, never more than an hour, never a hot loop', () => {
  const at = (iso) => Date.parse(iso);
  assert.equal(limitResetsAt(at('2026-10-08T15:20:00Z')), at('2026-10-09T00:00:00Z'));
  assert.equal(limitResetsAt(at('2026-10-08T00:00:00Z')), at('2026-10-09T00:00:00Z')); // exactly at a reset: the next one
  assert.equal(limitResetsAt(at('2026-10-08T23:59:59.999Z')), at('2026-10-09T00:00:00Z'));
  assert.equal(limitRetryDelayMs(at('2026-10-08T23:59:30Z')), 90_000);               // 30 s to midnight + the minute
  assert.equal(limitRetryDelayMs(at('2026-10-08T23:30:00Z')), 31 * 60_000);
  assert.equal(limitRetryDelayMs(at('2026-10-08T15:20:00Z')), 60 * 60_000);          // hours away: an hour at a time
  assert.equal(limitRetryDelayMs(at('2026-10-09T00:00:30Z')), 60 * 60_000);          // a fast clock's early knock: an hour, not a day
  // A whole day parked on the ceiling, refused every time: how many tries?
  let now = at('2026-10-08T00:00:30Z');
  let tries = 0;
  for (; now < at('2026-10-09T00:00:00Z'); now += limitRetryDelayMs(now)) tries += 1;
  assert.ok(tries <= 25, `${tries} tries in a day`);
  assert.ok(now - at('2026-10-09T00:00:00Z') <= 60_000, 'and the first try after the reset comes a minute after it');
  for (let t = at('2026-10-08T00:00:00Z'); t < at('2026-10-09T00:00:00Z'); t += 7 * 60_000 + 13_000) {
    const wait = limitRetryDelayMs(t);
    assert.ok(wait >= 60_000 && wait <= 60 * 60_000, `${new Date(t).toISOString()}: ${wait}`);
  }
});

test('a long wait keeps the parked marker fresh: restamped well inside the staleness window', () => {
  assert.ok(PARKED_RESTAMP_MS * 2 < PARKED_STALE_MS, 'a throttled timer firing late still stamps in time');
  assert.ok(retryDelayMs(99) <= PARKED_RESTAMP_MS, 'the network backoff never outlasts one stamp');
});
