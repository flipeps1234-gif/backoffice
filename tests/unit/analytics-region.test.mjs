import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const load = (path) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: () => { throw new Error(`${path} must stay dependency-free`); } },
  );
  return exports;
};
const { analyticsAllowedIn } = load('../../src/lib/analytics-region.ts');
const { clientCountry } = load('../../src/lib/request-ip.ts');
const headers = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });

test('analytics loads only where we positively know the visitor is outside the EU/EEA, UK, CH and Brazil', () => {
  for (const c of ['US', 'us', ' MX ', 'CA', 'CO', 'AR', 'PR']) assert.equal(analyticsAllowedIn(c), true, c);
  for (const c of ['DE', 'FR', 'PT', 'ES', 'IE', 'NO', 'IS', 'LI', 'GB', 'CH', 'BR', 'br', 'RE', 'GP']) assert.equal(analyticsAllowedIn(c), false, c);
  for (const c of ['', null, undefined, 'XX', 'T1', 'USA', 'U', '12']) assert.equal(analyticsAllowedIn(c), false, String(c));
});

test('clientCountry trusts Cloudflare only when the peer is Cloudflare; otherwise Vercel', () => {
  // Through Cloudflare (peer is an edge): Cloudflare's country wins.
  assert.equal(clientCountry(headers({ 'x-forwarded-for': '172.71.154.33', 'cf-ipcountry': 'de', 'x-vercel-ip-country': 'US' })), 'DE');
  // Direct to Vercel, someone types cf-ipcountry: ignored.
  assert.equal(clientCountry(headers({ 'x-forwarded-for': '203.0.113.9', 'cf-ipcountry': 'US', 'x-vercel-ip-country': 'FR' })), 'FR');
  assert.equal(clientCountry(headers({ 'x-forwarded-for': '203.0.113.9', 'x-vercel-ip-country': 'us' })), 'US');
  assert.equal(clientCountry(headers({})), '');
});
