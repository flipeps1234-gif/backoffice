import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The real modules, transpiled in place (same loader shape as savings.test.mjs).
const load = (relative) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: () => { throw new Error(`${relative} must stay dependency-free`); } },
  );
  return exports;
};
const { needsSetup, SETUP_STEPS } = load('../../src/lib/setup.ts');
const { messages } = load('../../src/lib/messages/setup.ts');

test('needsSetup: only a row-less account with an empty ledger (all 8 combinations)', () => {
  for (const profileExists of [false, true]) {
    for (const transactionCount of [0, 3]) {
      for (const saleCount of [0, 2]) {
        const expected = !profileExists && transactionCount === 0 && saleCount === 0;
        assert.equal(
          needsSetup({ profileExists, transactionCount, saleCount }),
          expected,
          `profileExists=${profileExists} txns=${transactionCount} sales=${saleCount}`,
        );
      }
    }
  }
  // Exactly one of the eight says yes.
  assert.equal(needsSetup({ profileExists: false, transactionCount: 0, saleCount: 0 }), true);
});

test('needsSetup: a blank row still counts as done (Skip creates one)', () => {
  assert.equal(needsSetup({ profileExists: true, transactionCount: 0, saleCount: 0 }), false);
});

test('the five steps, in order', () => {
  assert.deepEqual([...SETUP_STEPS], ['welcome', 'business', 'services', 'try', 'done']);
});

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('every setup.* key has non-empty en/es/pt with identical {placeholder} sets', () => {
  const keys = Object.keys(messages);
  assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.ok(key.startsWith('setup.'), `${key} belongs to another fragment`);
    const entry = messages[key];
    for (const locale of ['en', 'es', 'pt']) {
      assert.equal(typeof entry[locale], 'string', `${key}.${locale} missing`);
      assert.ok(entry[locale].trim().length > 0, `${key}.${locale} is empty`);
    }
    assert.deepEqual(placeholders(entry.es), placeholders(entry.en), `${key}: es placeholders`);
    assert.deepEqual(placeholders(entry.pt), placeholders(entry.en), `${key}: pt placeholders`);
  }
});

test('the copy keeps the register: no exclamation marks in any language', () => {
  for (const [key, entry] of Object.entries(messages)) {
    for (const locale of ['en', 'es', 'pt']) {
      assert.ok(!/[!¡]/.test(entry[locale]), `${key}.${locale} shouts`);
    }
  }
});

test('the step titles the wizard renders exist for every step', () => {
  for (const step of SETUP_STEPS) {
    assert.ok(`setup.${step}Title` in messages, `setup.${step}Title`);
  }
});
