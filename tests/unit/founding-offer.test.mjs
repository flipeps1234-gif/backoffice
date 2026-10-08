import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// founding-cta.tsx is a client component; how it reads the server's two
// answers is plain functions. Load the REAL file, transpiled, with inert
// stand-ins for what it renders with — any other import fails loudly.
const STUBS = {
  react: { useCallback: (fn) => fn, useEffect() {}, useId: () => 'id', useRef: () => ({ current: null }), useState: (v) => [v, () => {}], useSyncExternalStore: () => false },
  'next/link': { __esModule: true, default: () => null },
  './analytics': { trackEvent() {} },
  './use-locale': { useLocale: () => ({ t: (key) => key }) },
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'Fragment' },
};
const loadTs = (path, extra = {}) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (id) => {
        if (id in STUBS) return STUBS[id];
        throw new Error(`${path} imports "${id}" — give the test a stub or keep the import out`);
      },
      ...extra,
    },
  );
  return exports;
};

const { offerClosed, submitOutcome } = loadTs('../../src/app/founding-cta.tsx');
const { messages: landing } = loadTs('../../src/lib/messages/landing.ts');

test('only a clear {open: false} closes the offer; an error body, odd shapes or no body leave the form up', () => {
  assert.equal(offerClosed({ open: false }), true);
  for (const body of [{ open: true }, { open: 'false' }, { open: 0 }, { open: null }, {}, { error: 'Try again later.' }, null, undefined, false, 'closed', []]) {
    assert.equal(offerClosed(body), false, JSON.stringify(body));
  }
});

test('the POST answer: 2xx joined, 409 full (for every address alike), 429 wait, anything else an error', () => {
  for (const status of [200, 201, 204]) assert.equal(submitOutcome(status), 'done', String(status));
  assert.equal(submitOutcome(409), 'full');
  assert.equal(submitOutcome(429), 'slow');
  for (const status of [0, 302, 400, 403, 404, 500, 503]) assert.equal(submitOutcome(status), 'error', String(status));
});

test('the "full" copy exists in EN/ES/PT and never counts, counts down or hurries', () => {
  for (const key of ['landing.ctaFullTitle', 'landing.ctaFullBody', 'landing.openApp']) {
    for (const lang of ['en', 'es', 'pt']) {
      assert.equal(typeof landing[key]?.[lang], 'string', `${key}.${lang}`);
      assert.ok(landing[key][lang].trim().length > 0, `${key}.${lang}`);
    }
  }
  for (const lang of ['en', 'es', 'pt']) {
    const copy = `${landing['landing.ctaFullTitle'][lang]} ${landing['landing.ctaFullBody'][lang]}`;
    assert.doesNotMatch(copy, /\d/, `${lang}: no numbers — not "0 left", not a count`);
    assert.doesNotMatch(copy, /left|hurry|last chance|only|quedan|últim|rápido|restam|corra|só /i, lang);
    assert.doesNotMatch(copy, /!/, `${lang}: the register has no exclamation marks`);
  }
  // Anyone who joined is told they are still in, and that the app is free today — in every language.
  assert.match(landing['landing.ctaFullBody'].en, /already joined, you're still in\. contado is free to use today/);
  assert.match(landing['landing.ctaFullBody'].es, /ya te uniste, tu lugar sigue siendo tuyo\. .*gratis/);
  assert.match(landing['landing.ctaFullBody'].pt, /já entrou, sua vaga continua garantida\. .*grátis/);
});
