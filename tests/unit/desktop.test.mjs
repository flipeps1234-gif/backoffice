import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

// The real modules, transpiled in place (same loader shape as setup.test.mjs).
const load = (relative, globals = {}) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: () => { throw new Error(`${relative} must stay dependency-free`); }, ...globals },
  );
  return exports;
};

const { yearSeries, yearsWithData, seriesMonths, expectedCentsIn, calloutTop } = load('../../src/lib/desktop.ts');

/** deepEqual across the vm realm (its objects carry another Object.prototype). */
const sameValue = (actual, expected) => assert.equal(JSON.stringify(actual), JSON.stringify(expected));

const tx = (date, amountCents, extra = {}) => ({ business: true, date, direction: 'in', amountCents, ...extra });
const sale = (date, state, lines) => ({ date, state, lineItems: lines.map(([quantity, unitCents]) => ({ quantity, unitCents })) });

test('yearSeries: business rows by month; personal, undated, other years and out-of-range months skipped', () => {
  const s = yearSeries(
    [
      tx('2026-01-05', 12000),
      tx('2026-01-20', 3000, { direction: 'out' }),
      tx('2026-03-01', 5000),
      tx('2026-03-02', 999, { business: false }),
      tx('2026-02-02', 777, { business: null }),
      tx('', 4444),
      tx('2025-03-01', 8888),
      tx('2026-09-30', 1111),
    ],
    2026,
    3,
  );
  assert.deepEqual([...s.inCents], [12000, 0, 5000]);
  assert.deepEqual([...s.outCents], [3000, 0, 0]);
  assert.deepEqual([...s.keptCents], [9000, 0, 5000]);
});

test('yearSeries is transactions only (the Reports basis); EXPECTED sales are summed apart, OPEN/PAID never', () => {
  const s = yearSeries([tx('2026-02-10', 10000)], 2026, 2);
  assert.deepEqual([...s.inCents], [0, 10000]);
  const sales = [
    sale('2026-02-11', 'expected', [[1, 12000], [2.5, 333]]), // 12000 + round(832.5)=833
    sale('2025-12-30', 'expected', [[1, 5000]]),
    sale('2026-02-12', 'open', [[1, 50000]]),
    sale('2026-02-13', 'paid', [[1, 70000]]),
  ];
  assert.equal(expectedCentsIn(sales, 2026), 12833);
  assert.equal(expectedCentsIn(sales, 2025), 5000);
});

test('seriesMonths: 12 for a past year; this year through today, extended by rows dated ahead', () => {
  assert.equal(seriesMonths([], 2025, 2026, 9), 12);
  assert.equal(seriesMonths([tx('2026-03-01', 1)], 2026, 2026, 9), 9);
  assert.equal(seriesMonths([tx('2026-11-03', 30000)], 2026, 2026, 9), 11);
  assert.equal(seriesMonths([tx('2026-11-03', 30000, { business: false })], 2026, 2026, 9), 9);
  // The extended series now counts the future-dated row, like the service bars do.
  assert.equal(yearSeries([tx('2026-11-03', 30000)], 2026, 11).inCents[10], 30000);
});

test('yearSeries: kept goes negative when a month spends more than it made', () => {
  const s = yearSeries([tx('2026-01-02', 1000), tx('2026-01-03', 4000, { direction: 'out' })], 2026, 1);
  assert.deepEqual([...s.keptCents], [-3000]);
});

test('yearsWithData: this year always, newest first, at most four, never a future or absurd year', () => {
  assert.deepEqual([...yearsWithData([], [], 2026)], [2026]);
  const years = yearsWithData(
    [tx('2024-05-01', 1), tx('2062-01-01', 1), tx('', 1), tx('1999-01-01', 1), tx('2021-01-01', 1)],
    [sale('2023-01-01', 'open', []), sale('2022-01-01', 'open', [])],
    2026,
  );
  assert.deepEqual([...years], [2026, 2024, 2023, 2022]);
});

// ---- return-to: where a sign-in lands ----

const fakeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
};

test('returnTo: remembered path comes back once, then /app', () => {
  const localStorage = fakeStorage();
  const { rememberReturnTo, takeReturnTo } = load('../../src/lib/return-to.ts', { localStorage });
  rememberReturnTo('/demooo', 1000);
  assert.equal(takeReturnTo(2000), '/demooo');
  assert.equal(takeReturnTo(3000), '/app');
});

test('returnTo: stale (over an hour), future-stamped, malformed or foreign paths all answer /app', () => {
  const localStorage = fakeStorage();
  const { rememberReturnTo, takeReturnTo } = load('../../src/lib/return-to.ts', { localStorage });
  rememberReturnTo('/demooo', 0);
  assert.equal(takeReturnTo(60 * 60 * 1000), '/app');
  rememberReturnTo('/demooo', 5000);
  assert.equal(takeReturnTo(1000), '/app');
  localStorage.setItem('contado.returnTo', '{not json');
  assert.equal(takeReturnTo(), '/app');
  localStorage.setItem('contado.returnTo', JSON.stringify({ path: 'https://evil.example', at: Date.now() }));
  assert.equal(takeReturnTo(), '/app');
  rememberReturnTo('//evil.example', Date.now());
  assert.equal(localStorage.map.has('contado.returnTo'), false);
});

test('returnTo: blocked storage never throws', () => {
  const localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const { rememberReturnTo, takeReturnTo } = load('../../src/lib/return-to.ts', { localStorage });
  assert.doesNotThrow(() => rememberReturnTo('/demooo'));
  assert.equal(takeReturnTo(), '/app');
});

test('signInStarted: the marker holds a DIGEST of the address, lives an hour, survives a re-read, deletes itself when stale, and clears', async () => {
  const localStorage = fakeStorage();
  const { markSignInStarted, signInStartedHereFor, clearSignInStarted } = load('../../src/lib/return-to.ts', { localStorage, crypto, TextEncoder });
  assert.equal(await signInStartedHereFor('ana@x.test'), false);                 // a link on a device that never asked: confirm first
  await markSignInStarted(' Ana@X.test ', 1000);
  const stored = JSON.parse(localStorage.getItem('contado.signinStarted'));
  assert.ok(!/ana|x\.test|@/.test(stored.who), 'the address itself is not on the device');
  assert.match(stored.who, /^[0-9a-f]{64}$/);
  assert.equal(await signInStartedHereFor('ana@x.test', 2000), true);
  assert.equal(await signInStartedHereFor('ana@x.test', 2000), true);            // React may run an effect twice
  assert.equal(await signInStartedHereFor('attacker@evil.test', 2000), false);   // the other link in the same inbox
  assert.equal(await signInStartedHereFor(null, 2000), false);
  assert.equal(await signInStartedHereFor('ana@x.test', 500), false);            // a clock set back: stale, and gone
  assert.equal(localStorage.getItem('contado.signinStarted'), null);
  await markSignInStarted('ana@x.test', 1000);
  assert.equal(await signInStartedHereFor('ana@x.test', 1000 + 60 * 60 * 1000), false); // a magic link's own lifetime
  assert.equal(localStorage.getItem('contado.signinStarted'), null);             // deleted on the stale read
  await markSignInStarted('ana@x.test', 1000);
  clearSignInStarted();
  assert.equal(await signInStartedHereFor('ana@x.test', 2000), false);
  await markSignInStarted('google', 1000);
  assert.equal(await signInStartedHereFor('anyone@x.test', 2000), true);         // Google: no address known at start
  localStorage.setItem('contado.signinStarted', '{not json');
  assert.equal(await signInStartedHereFor('ana@x.test'), false);
});

/** A localStorage with length/key, for the helpers that scan keys. */
const storageWithKeys = () => {
  const store = new Map();
  return {
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
};
const fakeWindow = () => {
  const listeners = {};
  return {
    addEventListener: (k, f) => { (listeners[k] ??= []).push(f); },
    removeEventListener: (k, f) => { listeners[k] = (listeners[k] ?? []).filter((x) => x !== f); },
    dispatchEvent: (e) => { for (const f of listeners[e.type] ?? []) f(e); return true; },
  };
};
const FakeEvent = class { constructor(type) { this.type = type; } };

test('linkPending: one entry per account, shared by every tab, each cleared on its own; the unreadable-token entry falls with a confirmation; an hour-old entry is gone', () => {
  const localStorage = storageWithKeys(); const window = fakeWindow();
  const { markLinkPending, clearLinkPending, subscribeLinkPending, linkPendingSnapshot, parseLinkPending } = load('../../src/lib/return-to.ts', { localStorage, window, Event: FakeEvent });
  const T = 1_700_000_000_000;
  const read = () => parseLinkPending(linkPendingSnapshot(), T);
  let changes = 0;
  const stop = subscribeLinkPending(() => { changes += 1; });
  sameValue(read(), { set: false, subs: [] });
  markLinkPending('user-w', T);
  sameValue(read(), { set: true, subs: ['user-w'] }); assert.equal(changes, 1);
  markLinkPending('user-z', T);                                          // a second link: BOTH entries stay (pass 8)
  sameValue(read(), { set: true, subs: ['user-w', 'user-z'] });
  markLinkPending('user-w', T + 5);                                      // the same account again: one entry, re-stamped
  sameValue(read().subs.slice().sort(), ['user-w', 'user-z']);
  clearLinkPending('user-z', false, T);                                  // the failing second link drops ITS entry only
  sameValue(read(), { set: true, subs: ['user-w'] });
  window.dispatchEvent({ type: 'storage', key: 'contado.linkPending' });  // another tab wrote it
  const seen = changes;
  window.dispatchEvent({ type: 'storage', key: 'contado.theme' });        // unrelated key: ignored
  assert.equal(changes, seen);
  markLinkPending(null, T);                                              // an unreadable token: everyone asks
  assert.equal(read().subs.includes(null), true);
  clearLinkPending('user-w', false, T);                                  // an orphan clear leaves the unknown entry
  sameValue(read(), { set: true, subs: [null] });
  clearLinkPending('user-q', true, T);                                   // a Continue for any account answers it
  assert.equal(linkPendingSnapshot(), '');
  markLinkPending('old', T - 61 * 60_000);
  sameValue(parseLinkPending(linkPendingSnapshot(), T), { set: false, subs: [] });
  stop();
  const quiet = changes; markLinkPending('x', T); assert.equal(changes, quiet);
  // the flag's earlier shapes
  sameValue(parseLinkPending('1', T), { set: true, subs: [null] });
  sameValue(parseLinkPending('{"sub":"user-y"}', T), { set: true, subs: ['user-y'] });
  sameValue(parseLinkPending('{"sub":""}', T), { set: true, subs: [null] });
  sameValue(parseLinkPending('{not json', T), { set: true, subs: [null] });
});

test('callbackParams reads a URL exactly as auth-js does (query over hash, last duplicate wins, percent-encoded keys); tokenSubject reads the token it hands over', () => {
  const { callbackParams, tokenSubject } = load('../../src/lib/return-to.ts', { atob, URLSearchParams, URL });
  const { parseParametersFromURL } = createRequire(import.meta.url)('@supabase/auth-js/dist/main/lib/helpers.js');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = (sub) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email: `${sub}@example.invalid`, exp: 2e9 })}.sig`;
  const W = jwt('attacker-w'), D = jwt('decoy');
  const urls = [
    `https://getcontado.com/app#access_token=${W}&refresh_token=r&expires_in=3600&token_type=bearer&type=magiclink`,   // the real shape
    `https://getcontado.com/app?access_token=${W}&refresh_token=r&expires_in=3600&token_type=bearer`,                  // tokens in the query
    `https://getcontado.com/#access_token=${D}&access_token=${W}&refresh_token=r&expires_in=3600&token_type=bearer`,  // duplicate key: the last wins
    `https://getcontado.com/app#access%5Ftoken=${W}&refresh_token=r&expires_in=3600&token_type=bearer`,              // percent-encoded key
    `https://getcontado.com/app?access_token=${W}#access_token=${D}&refresh_token=r`,                                  // query over hash
    'https://getcontado.com/app',
    'https://getcontado.com/app#error=access_denied&error_code=otp_expired',
  ];
  for (const href of urls) sameValue(callbackParams(href), parseParametersFromURL(href));
  assert.equal(tokenSubject(callbackParams(urls[0]).access_token), 'attacker-w');
  assert.equal(tokenSubject(callbackParams(urls[2]).access_token), 'attacker-w');
  assert.equal(tokenSubject(callbackParams(urls[3]).access_token), 'attacker-w');
  assert.equal(tokenSubject(callbackParams(urls[4]).access_token), 'attacker-w');
  assert.equal(callbackParams(urls[5]).access_token, undefined);
  assert.equal(callbackParams('not a url').access_token, undefined);
  assert.equal(tokenSubject(undefined), null);
  assert.equal(tokenSubject('not.a-jwt'), null);
  assert.equal(tokenSubject(`${b64({})}.${b64({ sub: 7 })}.x`), null);                                       // a non-string subject
  assert.equal(tokenSubject(`${b64({})}.${Buffer.from('{"sub":"a"', 'utf8').toString('base64url')}.x`), null); // broken payload
});

test('storedSessionUserId: the account in the stored auth-js session, whatever the project ref; none / garbage / blocked → null', () => {
  const localStorage = storageWithKeys();
  const { storedSessionUserId } = load('../../src/lib/return-to.ts', { localStorage });
  assert.equal(storedSessionUserId(), null);
  localStorage.setItem('contado.locale', 'en');
  localStorage.setItem('sb-xdvnnqiwanpkdwvjtsfk-auth-token', JSON.stringify({ access_token: 't', user: { id: 'user-x' } }));
  assert.equal(storedSessionUserId(), 'user-x');
  localStorage.setItem('sb-xdvnnqiwanpkdwvjtsfk-auth-token', '{broken');
  assert.equal(storedSessionUserId(), null);
  const blocked = load('../../src/lib/return-to.ts', { localStorage: { get length() { throw new Error('blocked'); }, key() { throw new Error('blocked'); }, getItem() { throw new Error('blocked'); } } });
  assert.equal(blocked.storedSessionUserId(), null);
});

test('cents round as the database rounds them (0025 admin_overview): a product that is .5 in decimal and .4999… in binary goes UP', () => {
  assert.equal(50 * 0.29, 14.499999999999998);                                                 // the float; 14.5 in decimal
  assert.equal(Math.round(50 * 0.29), 14);                                                     // the bare float: the bug, as a control
  assert.equal(expectedCentsIn([sale('2026-02-01', 'expected', [[0.29, 50]])], 2026), 15);
  assert.equal(expectedCentsIn([sale('2026-02-01', 'expected', [[0.47, 2150]])], 2026), 1011);     // 1010.4999999999999 → 1011
  assert.equal(expectedCentsIn([sale('2026-02-01', 'expected', [[1.5, 267]])], 2026), 401);       // 400.5 exactly
  assert.equal(expectedCentsIn([sale('2026-02-01', 'expected', [[0.5, 3]])], 2026), 2);
  assert.equal(expectedCentsIn([sale('2026-02-01', 'expected', [[0.2, 2002]])], 2026), 400);      // 400.4: unchanged
  assert.equal(expectedCentsIn([sale('2026-02-01', 'expected', [[0.29, 51]])], 2026), 15);        // 14.79: unchanged
  assert.equal(expectedCentsIn([sale('2026-02-01', 'expected', [[2, 1999]])], 2026), 3998);       // integers: untouched
});

test('signInStarted / linkPending: blocked storage never throws; the marker reads "not started" (confirm first) and the SHARED flag reads false — the tab-local gate in upload-screen.tsx covers that case', async () => {
  const localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
  const Event = class { constructor(type) { this.type = type; } };
  const api = load('../../src/lib/return-to.ts', { localStorage, window, Event, crypto, TextEncoder });
  await assert.doesNotReject(() => api.markSignInStarted('ana@x.test'));
  assert.equal(await api.signInStartedHereFor('ana@x.test'), false);
  assert.doesNotThrow(() => api.clearSignInStarted());
  assert.doesNotThrow(() => api.markLinkPending('user-y'));
  assert.equal(api.linkPendingSnapshot(), '');
  sameValue(api.parseLinkPending(api.linkPendingSnapshot()), { set: false, subs: [] });
  assert.doesNotThrow(() => api.clearLinkPending('user-y', true));
  assert.equal(api.storedSessionUserId(), null);
});

// ---- the chart callout ----

/** The compact Chart's geometry (desktop-overview.tsx), reproduced. */
const compactChart = (values) => {
  const W = 360, H = 280, L = 48, R = 12, T = 16, B = 36, boxW = 200, boxH = 72;
  const pw = W - L - R, ph = H - T - B, n = values.length;
  const hi = Math.max(...values, 0), lo = Math.min(...values, 0);
  const span = Math.max(hi - lo, 1);
  const STEPS = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000, 2000000, 2500000, 5000000];
  const step = STEPS.find((s) => Math.ceil(span / s) <= 6) ?? 5000000;
  const top = Math.max(Math.ceil(hi / step) * step, step), bottom = Math.floor(lo / step) * step;
  const x = (i) => (n === 1 ? L + pw / 2 : L + (pw * i) / (n - 1));
  const y = (v) => T + ph - ((v - bottom) / (top - bottom)) * ph;
  return (active) => {
    const bx = Math.min(Math.max(active > (n - 1) / 2 ? x(active) - boxW - 16 : x(active) + 16, L), W - R - boxW);
    const by = calloutTop({ top: T, plotHeight: ph, boxX: bx, boxWidth: boxW, boxHeight: boxH, activeX: x(active), activeY: y(values[active]), points: values.map((v, i) => ({ x: x(i), y: y(v) })) });
    return { by, px: x(active), py: y(values[active]), T, ph, boxH };
  };
};

test('callout: in the plot, never on the active dot — a steady year with a low running month, spikes, negatives, one month', () => {
  const series = [
    [80000, 90000, 85000, 95000, 100000, 92000, 88000, 97000, 91000, 5000],   // pass-2 review: months 3 and 4 were covered
    [120000, 160000, 140000, 210000, 190000, 240000, 220000, 260000, 230000, 72000],
    [0, 0, 0, 0, 900000, 0, 0],
    [-30000, 50000, -20000, 80000, -60000, 40000, 10000, -5000],
    [12345],
    Array(12).fill(0),
  ];
  for (const values of series) {
    const place = compactChart(values);
    for (let active = 0; active < values.length; active += 1) {
      const { by, py, T, ph, boxH } = place(active);
      assert.ok(Number.isFinite(by), `finite for ${values} @${active}`);
      assert.ok(by >= T && by + boxH <= T + ph, `inside the plot for ${values} @${active}: ${by}`);
      assert.ok(py < by - 6 || py > by + boxH + 6, `off the active dot for ${values} @${active}: dot ${py}, box ${by}..${by + boxH}`);
    }
  }
});

test('callout: a low running month puts the box below the earlier dots, not over them', () => {
  const values = [120000, 160000, 140000, 210000, 190000, 240000, 220000, 260000, 230000, 72000];
  const place = compactChart(values);
  const { by, boxH } = place(9);
  const pts = values.map((v, i) => ({ v, i }));
  // every dot the box spans horizontally (x >= bx-6) sits above the box
  const W = 360, L = 48, pw = 300; const x = (i) => L + (pw * i) / 9;
  const bx = Math.min(Math.max(x(9) - 200 - 16, L), W - 12 - 200);
  const yOf = (v) => 16 + 228 - (v / 300000) * 228;
  // a dot is drawn with radius 3.5: its centre must clear the box edge by that
  for (const { v, i } of pts) if (i !== 9 && x(i) >= bx - 6) assert.ok(yOf(v) < by - 3.5, `month ${i} dot ${yOf(v)} above box top ${by}`);
  assert.ok(by + boxH <= 16 + 228);
});

// ---- the desktop dictionary ----

test('desktop messages: every key has EN, ES and PT, non-empty, with the same placeholders', () => {
  const { messages } = load('../../src/lib/messages/desktop.ts');
  const holes = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  const keys = Object.keys(messages);
  assert.ok(keys.length > 30);
  for (const key of keys) {
    const entry = messages[key];
    assert.ok(key.startsWith('desktop.'), key);
    for (const lang of ['en', 'es', 'pt']) assert.ok(entry[lang]?.trim(), `${key}.${lang}`);
    assert.equal(holes(entry.es), holes(entry.en), `${key} es placeholders`);
    assert.equal(holes(entry.pt), holes(entry.en), `${key} pt placeholders`);
  }
});
