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

const { yearSeries, yearsWithData, seriesMonths, expectedCentsIn } = load('../../src/lib/desktop.ts');

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
