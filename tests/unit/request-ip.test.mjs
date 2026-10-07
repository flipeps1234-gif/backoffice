import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL('../../src/lib/request-ip.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: () => { throw new Error('request-ip.ts must stay dependency-free'); } },
);
const { isCloudflareIp, clientIp } = exports;
const headers = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });

test('isCloudflareIp: the published edge ranges, v4 and v6; everything else is not', () => {
  assert.equal(isCloudflareIp('172.71.154.33'), true);          // 172.64.0.0/13
  assert.equal(isCloudflareIp('104.23.9.1'), true);             // 104.16.0.0/13
  assert.equal(isCloudflareIp('162.159.255.255'), true);        // 162.158.0.0/15
  assert.equal(isCloudflareIp('2a06:98c0:3600::103'), true);    // 2a06:98c0::/29
  assert.equal(isCloudflareIp('2606:4700:4700::1111'), true);
  assert.equal(isCloudflareIp('203.0.113.9'), false);
  assert.equal(isCloudflareIp('8.8.8.8'), false);
  assert.equal(isCloudflareIp('2001:4860:4860::8888'), false);
  assert.equal(isCloudflareIp('not an ip'), false);
  assert.equal(isCloudflareIp('999.1.1.1'), false);
  assert.equal(isCloudflareIp(''), false);
});

test('clientIp: cf-connecting-ip counts only when the peer Vercel saw is a Cloudflare edge', () => {
  // proxied by Cloudflare: Vercel's peer is the edge → the real client is in cf-connecting-ip
  assert.equal(clientIp(headers({ 'x-forwarded-for': '172.71.154.33', 'cf-connecting-ip': '203.0.113.9' })), '203.0.113.9');
  // straight to the Vercel host: the peer IS the client, and cf-connecting-ip is whatever they typed
  assert.equal(clientIp(headers({ 'x-forwarded-for': '198.51.100.7', 'cf-connecting-ip': '203.0.113.9' })), '198.51.100.7');
  assert.equal(clientIp(headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' })), '198.51.100.7');
  // local dev / previews
  assert.equal(clientIp(headers({ 'cf-connecting-ip': '203.0.113.9' })), '203.0.113.9');
  assert.equal(clientIp(headers({})), 'unknown');
});
