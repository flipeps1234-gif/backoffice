// The phone menu's two escape hatches (2026-10-08 review, findings 2 and 5):
// closing when the window reaches lg, and asking the mounted Ledger before a
// layout link reloads the page. The real exports of desktop-shell.tsx, with
// its UI imports stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const source = readFileSync(new URL('../../src/app/desktop-shell.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
const mod = { exports: {} };
const req = (spec) => (spec === 'react' || spec === 'react-dom' || spec.startsWith('react/') ? nodeRequire(spec) : { default: () => null });
new Function('exports', 'require', 'module', outputText)(mod.exports, req, mod);
const { closeWhenWide, askToSwitchLayout, LAYOUT_EVENT } = mod.exports;

const fakeQuery = (matches) => {
  const listeners = new Set();
  return {
    matches,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
    fire(next) { this.matches = next; for (const fn of listeners) fn(); },
    get count() { return listeners.size; },
  };
};

test('closeWhenWide: closes at once when already wide, and whenever the window becomes wide', () => {
  let closed = 0;
  const wide = fakeQuery(true);
  const stop = closeWhenWide(wide, () => closed++);
  assert.equal(closed, 1);
  stop();
  assert.equal(wide.count, 0, 'unsubscribed');

  closed = 0;
  const narrow = fakeQuery(false);
  const stop2 = closeWhenWide(narrow, () => closed++);
  assert.equal(closed, 0);
  narrow.fire(false);
  assert.equal(closed, 0, 'still narrow');
  narrow.fire(true);
  assert.equal(closed, 1, 'became wide: closed');
  stop2();
  narrow.fire(true);
  assert.equal(closed, 1, 'no calls after unsubscribe');
});

test('askToSwitchLayout: the Ledger can refuse a plain click; modified clicks are left to the browser', () => {
  globalThis.window = new EventTarget();
  const click = (over = {}) => {
    let prevented = false;
    return { event: { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0, preventDefault: () => { prevented = true; }, ...over }, prevented: () => prevented };
  };
  // Nobody listening (a gate, signed out): the link loads.
  let c = click();
  assert.equal(askToSwitchLayout(c.event), true);
  assert.equal(c.prevented(), false);
  // The Ledger says not now (an entry open, a save on its way): the page stays.
  const refuse = (e) => e.preventDefault();
  window.addEventListener(LAYOUT_EVENT, refuse);
  c = click();
  assert.equal(askToSwitchLayout(c.event), false);
  assert.equal(c.prevented(), true);
  // A new-tab click keeps this page, so nothing is at risk: never asked.
  for (const over of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }]) {
    c = click(over);
    assert.equal(askToSwitchLayout(c.event), true, JSON.stringify(over));
    assert.equal(c.prevented(), false);
  }
  window.removeEventListener(LAYOUT_EVENT, refuse);
  delete globalThis.window;
});
