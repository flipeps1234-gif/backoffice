import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

// csv.ts imports its siblings, so this loader follows relative imports
// (the dependency-free loader of desktop.test.mjs cannot). Still the real
// modules, transpiled in memory.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/lib');
const cache = new Map();
const load = (file) => {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (spec) => {
    if (!spec.startsWith('.')) throw new Error(`${file} must not import ${spec}`);
    const base = resolve(dirname(file), spec);
    const found = [`${base}.ts`, `${base}/index.ts`].find((p) => existsSync(p));
    if (!found) throw new Error(`cannot resolve ${spec} from ${file}`);
    return load(found);
  };
  vm.runInNewContext(js, { exports: mod.exports, module: mod, require });
  return mod.exports;
};
const { taxCsv, everythingCsv } = load(resolve(root, 'csv.ts'));
const { languageLabel } = load(resolve(root, 'admin/overview.ts'));

const row = (payer, memo) => ({
  id: 'r', date: '2026-09-03', payer, memo, amountCents: 2000, direction: 'in', business: true,
  source: 'screenshot', category: null, serviceId: null, matchedSaleId: null,
});
/** A spreadsheet's reader: split on the given delimiters; a quote counts only when it OPENS a field. */
const cells = (line, delims) => {
  const out = []; let cur = '', quoted = false, atStart = true;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch; continue; }
    if (atStart && ch === '"') { quoted = true; atStart = false; continue; }
    if (delims.includes(ch)) { out.push(cur); cur = ''; atStart = true; continue; }
    cur += ch; atStart = false;
  }
  out.push(cur);
  return out;
};
const dataLines = (csv) => csv.replace(/^﻿/, '').split('\r\n').filter(Boolean).slice(1);
const live = (cell) => /^\s*[=+\-@]/.test(cell) && !/^-?\d+(\.\d+)?$/.test(cell);

test('csv: no cell starts a formula under comma, semicolon or tab splitting', () => {
  const hostile = [
    ['=HYPERLINK(1)', '@SUM(1)'],
    ["Ana;=cmd|'/c calc'!A1;", 'thanks;=WEBSERVICE(A1);'],
    ['Bob', 'tip\t=1+1\tx'],
    ['Eve; +1', 'a;\r=2'],
    [' =1+1', ';-2+3'],
    ['Ana;"=cmd|calc"', 'x;" "=HYPERLINK(1)'],
    ['"=1+1', ';""@SUM(1)'],
  ];
  for (const make of [taxCsv, (rows) => everythingCsv(rows, [], [], [], [])]) {
    const csv = make(hostile.map(([p, m]) => row(p, m)), []);
    for (const line of dataLines(csv)) {
      for (const delims of [[','], [';'], [',', ';', '\t']]) {
        const bad = cells(line, delims).filter(live);
        assert.deepEqual(bad, [], `live cell under ${JSON.stringify(delims)} in: ${line}`);
      }
    }
  }
});

test('csv: ordinary text is unchanged and columns stay put for a comma reader', () => {
  const csv = taxCsv([row('Maria Santos', 'lawn, hedges'), row('O"Neil', 'paid; thanks')], []);
  const [a, b] = dataLines(csv).map((l) => cells(l, [',']));
  assert.equal(a.length, b.length);
  assert.ok(a.includes('Maria Santos') && a.includes('lawn, hedges'));
  assert.ok(b.includes('O"Neil') && b.includes('paid; thanks'));
  assert.equal(a.at(-1), '20.00');                              // the amount is still the last column
});

test('admin languageLabel: an account-chosen code is never an object key', () => {
  assert.equal(languageLabel('es'), 'Español');
  assert.equal(languageLabel('xx'), 'xx');
  for (const code of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.equal(languageLabel(code), code);
  }
});
