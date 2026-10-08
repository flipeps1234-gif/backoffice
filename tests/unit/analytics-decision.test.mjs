import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// analytics.tsx is a client component, but its decisions are plain
// functions. Load the REAL file, transpiled, with inert stand-ins for the
// three modules it renders with — any other import fails loudly here.
const STUBS = {
  react: { useEffect() {}, useSyncExternalStore: () => false },
  'next/navigation': { usePathname: () => '/' },
  'next/script': { __esModule: true, default: () => null },
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'Fragment' },
};
const load = () => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL('../../src/app/analytics.tsx', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (id) => {
        if (id in STUBS) return STUBS[id];
        throw new Error(`analytics.tsx imports "${id}" — give the test a stub or keep the import out`);
      },
      process: { env: {} },
      setTimeout,
      clearTimeout,
      AbortController,
    },
  );
  return exports;
};

const {
  isPublicPath,
  privacySignalSaysNo,
  mayAskRegion,
  parseRegionAnswer,
  readRegionAnswer,
  regionAllowsAnalytics,
  REGION_KEY,
  REGION_TIMEOUT_MS,
} = load();

/** sessionStorage stand-in; `blocked` throws on every call, like Safari's "Block all cookies". */
const session = (initial = {}, { blocked = false } = {}) => {
  const data = new Map(Object.entries(initial));
  const guard = () => {
    if (blocked) throw new Error('SecurityError: storage blocked');
  };
  return {
    data,
    getItem: (key) => (guard(), data.has(key) ? data.get(key) : null),
    setItem: (key, value) => (guard(), data.set(key, String(value))),
  };
};

/** askServer stand-in that counts its calls and answers with `reply()`. */
const server = (reply) => {
  const calls = [];
  const askServer = (signal) => {
    calls.push(signal);
    return reply(signal);
  };
  return { calls, askServer };
};

test('/join is private, with the app, the API and the signed-in /demooo; the marketing pages and /demoo stay public', () => {
  for (const path of ['/join', '/join/', '/join/abc', '/app', '/app/classic', '/app/admin', '/api/geo', '/api/founding', '/demooo']) {
    assert.equal(isPublicPath(path), false, path);
  }
  for (const path of ['/', '/pricing', '/faq', '/help/getting-started', '/for/cleaners', '/track/venmo', '/privacy', '/demoo']) {
    assert.equal(isPublicPath(path), true, path);
  }
});

test('Do Not Track or Global Privacy Control alone is a no; anything else is not a signal', () => {
  assert.equal(privacySignalSaysNo({ doNotTrack: '1' }), true);
  assert.equal(privacySignalSaysNo({ globalPrivacyControl: true }), true);
  assert.equal(privacySignalSaysNo({ doNotTrack: '1', globalPrivacyControl: true }), true);
  for (const signals of [{}, { doNotTrack: null }, { doNotTrack: '0' }, { doNotTrack: 'unspecified' }, { globalPrivacyControl: false }]) {
    assert.equal(privacySignalSaysNo(signals), false, JSON.stringify(signals));
  }
});

test('the region question is asked only when the ID, the path and DNT/GPC all already say yes, never on a sign-in return', () => {
  const yes = { gaId: 'G-TEST', path: '/pricing', trackingAllowed: true, authReturn: false };
  assert.equal(mayAskRegion(yes), true);
  // DNT or GPC said no (or the server render): no request at all.
  assert.equal(mayAskRegion({ ...yes, trackingAllowed: false }), false);
  assert.equal(mayAskRegion({ ...yes, gaId: '' }), false);
  assert.equal(mayAskRegion({ ...yes, gaId: undefined }), false);
  for (const path of ['/app', '/api/geo', '/demooo', '/join']) assert.equal(mayAskRegion({ ...yes, path }), false, path);
  assert.equal(mayAskRegion({ ...yes, authReturn: true }), false);
});

test('only a boolean from /api/geo is an answer', () => {
  assert.equal(parseRegionAnswer({ analytics: true }), true);
  assert.equal(parseRegionAnswer({ analytics: false }), false);
  for (const body of [{ analytics: 'true' }, { analytics: 1 }, { analytics: null }, {}, [], null, undefined, 'true', true, 1]) {
    assert.equal(parseRegionAnswer(body), null, JSON.stringify(body));
  }
});

test('the session keeps "1" or "0"; anything else, or blocked storage, is no answer yet', () => {
  assert.equal(readRegionAnswer(session({ [REGION_KEY]: '1' })), true);
  assert.equal(readRegionAnswer(session({ [REGION_KEY]: '0' })), false);
  assert.equal(readRegionAnswer(session({ [REGION_KEY]: 'yes' })), null);
  assert.equal(readRegionAnswer(session()), null);
  assert.equal(readRegionAnswer(session({ [REGION_KEY]: '1' }, { blocked: true })), null);
  assert.equal(readRegionAnswer(null), null);
  assert.match(REGION_KEY, /^contado\./);
  assert.equal(REGION_TIMEOUT_MS, 3000);
});

test('a kept answer is used as is: no request, either way', async () => {
  for (const [kept, expected] of [['1', true], ['0', false]]) {
    const { calls, askServer } = server(() => Promise.resolve({ analytics: !expected }));
    assert.equal(await regionAllowsAnalytics({ storage: session({ [REGION_KEY]: kept }), askServer }), expected);
    assert.equal(calls.length, 0);
  }
});

test('asked once, a real answer is returned and kept for the session', async () => {
  for (const analytics of [true, false]) {
    const storage = session();
    const { calls, askServer } = server(() => Promise.resolve({ analytics }));
    assert.equal(await regionAllowsAnalytics({ storage, askServer }), analytics);
    assert.equal(calls.length, 1);
    assert.equal(storage.data.get(REGION_KEY), analytics ? '1' : '0');
    // The next page load in this session reads it instead of asking.
    assert.equal(await regionAllowsAnalytics({ storage, askServer }), analytics);
    assert.equal(calls.length, 1);
  }
});

test('an error, a non-boolean or a synchronous throw means no analytics, and nothing is kept', async () => {
  const replies = [
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => Promise.resolve({ analytics: 'true' }),
    () => Promise.resolve({ country: 'US' }),
    () => Promise.resolve(null),
    () => {
      throw new Error('fetch is not a function');
    },
  ];
  for (const reply of replies) {
    const storage = session();
    const { askServer } = server(reply);
    assert.equal(await regionAllowsAnalytics({ storage, askServer }), false, String(reply));
    assert.equal(storage.data.has(REGION_KEY), false, String(reply));
  }
});

test('no answer in time: no analytics, the request is aborted, nothing is kept — and a late yes changes nothing', async () => {
  const storage = session();
  let lateYes;
  const { calls, askServer } = server(() => new Promise((resolve) => (lateYes = resolve)));
  const started = Date.now();
  assert.equal(await regionAllowsAnalytics({ storage, askServer, timeoutMs: 30 }), false);
  assert.ok(Date.now() - started >= 25, 'waited for the timeout');
  assert.equal(calls[0].aborted, true);
  lateYes({ analytics: true });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(storage.data.has(REGION_KEY), false);
});

test('blocked or missing storage: still asked, still answered, never thrown', async () => {
  for (const storage of [session({}, { blocked: true }), null]) {
    const { calls, askServer } = server(() => Promise.resolve({ analytics: true }));
    assert.equal(await regionAllowsAnalytics({ storage, askServer }), true);
    assert.equal(calls.length, 1);
  }
});
