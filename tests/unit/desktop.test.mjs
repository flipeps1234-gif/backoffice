import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

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

test('signInStarted: the marker is bound to the address it was started for, lives an hour, survives a re-read, and clears', () => {
  const localStorage = fakeStorage();
  const { markSignInStarted, signInStartedHereFor, clearSignInStarted } = load('../../src/lib/return-to.ts', { localStorage });
  assert.equal(signInStartedHereFor('ana@x.test'), false);                 // a link on a device that never asked: confirm first
  markSignInStarted(' Ana@X.test ', 1000);
  assert.equal(signInStartedHereFor('ana@x.test', 2000), true);
  assert.equal(signInStartedHereFor('ana@x.test', 2000), true);            // React may run an initializer twice
  assert.equal(signInStartedHereFor('attacker@evil.test', 2000), false);   // the other link in the same inbox
  assert.equal(signInStartedHereFor(null, 2000), false);
  assert.equal(signInStartedHereFor('ana@x.test', 1000 + 60 * 60 * 1000), false); // a magic link's own lifetime
  assert.equal(signInStartedHereFor('ana@x.test', 500), false);            // a clock set back
  clearSignInStarted();
  assert.equal(signInStartedHereFor('ana@x.test', 2000), false);
  markSignInStarted('google', 1000);
  assert.equal(signInStartedHereFor('anyone@x.test', 2000), true);         // Google: no address known at start
  localStorage.setItem('contado.signinStarted', '{not json');
  assert.equal(signInStartedHereFor('ana@x.test'), false);
});

test('linkPending: persisted, readable by every tab, cleared on confirm', () => {
  const localStorage = fakeStorage();
  const listeners = {};
  const window = {
    addEventListener: (k, f) => { (listeners[k] ??= []).push(f); },
    removeEventListener: (k, f) => { listeners[k] = (listeners[k] ?? []).filter((x) => x !== f); },
    dispatchEvent: (e) => { for (const f of listeners[e.type] ?? []) f(e); return true; },
  };
  const Event = class { constructor(type) { this.type = type; } };
  const { markLinkPending, clearLinkPending, subscribeLinkPending, linkPendingSnapshot } = load('../../src/lib/return-to.ts', { localStorage, window, Event });
  let changes = 0;
  const stop = subscribeLinkPending(() => { changes += 1; });
  assert.equal(linkPendingSnapshot(), false);
  markLinkPending();
  assert.equal(linkPendingSnapshot(), true); assert.equal(changes, 1);
  window.dispatchEvent({ type: 'storage', key: 'contado.linkPending' });    // another tab wrote it
  assert.equal(changes, 2);
  window.dispatchEvent({ type: 'storage', key: 'contado.theme' });          // unrelated key: ignored
  assert.equal(changes, 2);
  clearLinkPending();
  assert.equal(linkPendingSnapshot(), false); assert.equal(changes, 3);
  stop();
  markLinkPending();
  assert.equal(changes, 3);
});

test('signInStarted / linkPending: blocked storage answers "confirm first" and never throws', () => {
  const localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
  const Event = class { constructor(type) { this.type = type; } };
  const api = load('../../src/lib/return-to.ts', { localStorage, window, Event });
  assert.doesNotThrow(() => api.markSignInStarted('ana@x.test'));
  assert.equal(api.signInStartedHereFor('ana@x.test'), false);
  assert.doesNotThrow(() => api.clearSignInStarted());
  assert.doesNotThrow(() => api.markLinkPending());
  assert.equal(api.linkPendingSnapshot(), false);
  assert.doesNotThrow(() => api.clearLinkPending());
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
