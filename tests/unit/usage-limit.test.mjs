import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The extract route with its imports stubbed (the shape of
// tests/security/routes.test.mjs), to pin the 429's contract: a code and
// a countdown the web client turns into "uploads resume today at 7:00 PM",
// plus the English `error` older clients still read.
const transpile = (relative) =>
  ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

const route = (retryAfter) => {
  const exports = {};
  const imports = {
    '@/lib/extract': { activeProviderName: () => 'openai', extract: async () => ({ transactions: [], warnings: [] }) },
    '@/lib/request-ip': { clientIp: () => '192.0.2.1' },
    '@/lib/extract/image-types': { IMAGE_TYPES: new Set(['image/png']) },
    '@/lib/extract/today': { resolveToday: () => '2026-10-08' },
    '@/lib/supabase/security': {
      reserveExtraction: async () => ({ allowed: false, retry_after: retryAfter }),
      finishExtraction: async () => {},
    },
    '@/lib/supabase/server': {
      isSupabaseConfigured: true,
      verifyAccessToken: async () => ({ accountId: '22222222-2222-4222-8222-222222222222', email: 'local@example.invalid' }),
    },
  };
  vm.runInNewContext(transpile('../../src/app/api/extract/route.ts'), {
    exports,
    require: (id) => {
      if (!(id in imports)) throw new Error(`Unstubbed import: ${id}`);
      return imports[id];
    },
    process: { env: { NODE_ENV: 'production' } },
    Request, Response, File, FormData, Buffer, AbortSignal, Date,
    console: { error() {}, warn() {}, log() {} },
  });
  return exports.POST;
};

const upload = () => {
  const body = new FormData();
  body.append('screenshots', new File(['x'], 'a.png', { type: 'image/png' }));
  return new Request('http://local.test/api/extract', { method: 'POST', headers: { authorization: 'Bearer valid' }, body });
};

test('usage limit: the 429 carries a code and the countdown, not only English prose', async () => {
  for (const seconds of [120, 18_000, 2_000_000]) {
    const response = await route(seconds)(upload());
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), String(seconds));
    const body = await response.json();
    assert.equal(body.code, 'usage_limit');
    assert.equal(body.retryAfter, seconds);
    assert.equal(typeof body.error, 'string');
  }
});

test('usage limit: every resume message exists in EN/ES/PT with the same placeholder', () => {
  const exports = {};
  vm.runInNewContext(transpile('../../src/lib/messages/home.ts'), { exports });
  const { messages } = exports;
  const expected = {
    'home.errUsageToday': '{time}',
    'home.errUsageTomorrow': '{time}',
    'home.errUsageLater': '{date}',
    'home.errUsageBusy': null,
  };
  for (const [key, placeholder] of Object.entries(expected)) {
    for (const lang of ['en', 'es', 'pt']) {
      const text = messages[key]?.[lang];
      assert.ok(text, `${key}.${lang} missing`);
      if (placeholder) assert.ok(text.includes(placeholder), `${key}.${lang} lacks ${placeholder}`);
      else assert.doesNotMatch(text, /\{\w+\}/, `${key}.${lang}`);
    }
  }
});
