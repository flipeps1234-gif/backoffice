import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// matching.ts with its one runtime import stubbed (sale.ts's total).
const exports = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL('../../src/lib/matching.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  {
    exports,
    require: (id) => {
      if (id === './sale') return { saleTotalCents: (s) => s.lineItems.reduce((n, l) => n + Math.round(l.unitCents * l.quantity), 0) };
      throw new Error(`unexpected import ${id}`);
    },
  },
);
const { datesCompatible, datesCompatibleForOwner, LATE_PAYMENT_DAYS, txnCandidatesForSale, unmatchedPaymentsFor } = exports;

test("the owner's window (hand-link, Got cash's question) reaches a late payer; the engine's stays ±10 days", () => {
  assert.equal(datesCompatible('2026-09-26', '2026-09-15'), false);          // 11 days late: the engine does not guess
  assert.equal(datesCompatibleForOwner('2026-09-26', '2026-09-15'), true);   // the owner may link it
  assert.equal(datesCompatibleForOwner('2026-10-06', '2026-09-15'), true);
  assert.equal(datesCompatibleForOwner('2026-09-05', '2026-09-15'), true);   // 10 days before: the engine's own window
  assert.equal(datesCompatibleForOwner('2026-09-04', '2026-09-15'), false);  // paid before the job: not this sale
  assert.equal(LATE_PAYMENT_DAYS, 120);
  assert.equal(datesCompatibleForOwner('2027-01-13', '2026-09-15'), true);   // day 120
  assert.equal(datesCompatibleForOwner('2027-01-14', '2026-09-15'), false);  // day 121
  assert.equal(datesCompatibleForOwner('', '2026-09-15'), true);             // no readable date never disqualifies
});

test('a $125 Venmo three weeks after a $120 OPEN sale: no auto-guess, but the picker and Got cash both see it', () => {
  const sale = { id: 's1', clientId: 'c1', date: '2026-09-15', state: 'open', lineItems: [{ quantity: 1, unitCents: 12000 }] };
  const late = { id: 't1', direction: 'in', matchedSaleId: null, business: true, amountCents: 12500, payer: 'Rosa', date: '2026-10-06' };
  const exact = { ...late, id: 't2', amountCents: 12000 };
  assert.equal(txnCandidatesForSale([exact], sale, 'Rosa').length, 0);                                                  // the engine: outside ±10 days
  assert.equal(txnCandidatesForSale([late, exact], sale, 'Rosa', { relaxName: true, relaxAmount: true, relaxDate: true }).length, 2);
  assert.equal(unmatchedPaymentsFor([late], sale, 'Rosa').length, 1);                                                  // Got cash asks first
  assert.equal(unmatchedPaymentsFor([{ ...late, matchedSaleId: 'other' }], sale, 'Rosa').length, 0);                   // already linked: not offered
});
