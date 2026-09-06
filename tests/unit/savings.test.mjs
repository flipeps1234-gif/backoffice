import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The real module, transpiled in place (same loader shape as tests/security).
const exports = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL('../../src/lib/savings.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: () => { throw new Error('savings.ts must stay dependency-free'); } },
);
const { monthlySavings, CONTADO_MINUTES_PER_WEEK, WEEKS_PER_MONTH, RATE_RANGE, HOURS_RANGE } = exports;

test('the stated assumption is the one the math uses', () => {
  assert.equal(CONTADO_MINUTES_PER_WEEK, 15);
  assert.ok(Math.abs(WEEKS_PER_MONTH - 52 / 12) < 1e-12);
});

test('3 h/week at $35/h: 2.75 h/week back → 11.9 h and $417 a month, integer cents', () => {
  const s = monthlySavings(35_00, 3);
  assert.ok(Math.abs(s.hoursPerMonthNow - 13) < 1e-9);
  assert.ok(Math.abs(s.hoursSavedPerMonth - 2.75 * (52 / 12)) < 1e-9);
  assert.equal(s.moneySavedCentsPerMonth, Math.round(2.75 * (52 / 12) * 3500));
  assert.equal(s.moneySavedCentsPerMonth, 41708);
  assert.ok(Number.isInteger(s.moneySavedCentsPerMonth));
});

test('never negative: less than the contado minutes saves nothing, and bad input is zero', () => {
  assert.equal(monthlySavings(50_00, 0.1).hoursSavedPerMonth, 0);
  assert.equal(monthlySavings(50_00, 0.1).moneySavedCentsPerMonth, 0);
  assert.equal(monthlySavings(50_00, 0.25).moneySavedCentsPerMonth, 0); // exactly the 15 minutes
  for (const bad of [NaN, Infinity, -5]) {
    assert.equal(monthlySavings(bad, 3).moneySavedCentsPerMonth, 0);
    assert.equal(monthlySavings(35_00, bad).moneySavedCentsPerMonth, 0);
  }
});

test('monotone: more hours or a higher rate never lowers the estimate', () => {
  let prev = -1;
  for (let h = HOURS_RANGE.min; h <= HOURS_RANGE.max; h += HOURS_RANGE.step) {
    const v = monthlySavings(RATE_RANGE.initial * 100, h).moneySavedCentsPerMonth;
    assert.ok(v >= prev); prev = v;
  }
  prev = -1;
  for (let r = RATE_RANGE.min; r <= RATE_RANGE.max; r += RATE_RANGE.step) {
    const v = monthlySavings(r * 100, HOURS_RANGE.initial).moneySavedCentsPerMonth;
    assert.ok(v >= prev); prev = v;
  }
});

test('the slider ranges land on their steps and hold their defaults', () => {
  for (const r of [RATE_RANGE, HOURS_RANGE]) {
    assert.ok(r.min < r.initial && r.initial < r.max);
    assert.ok(Math.abs(((r.initial - r.min) / r.step) % 1) < 1e-9, 'default sits on a step');
    assert.ok(Math.abs(((r.max - r.min) / r.step) % 1) < 1e-9, 'max sits on a step');
  }
});
