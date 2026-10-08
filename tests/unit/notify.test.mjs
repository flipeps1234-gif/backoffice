import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The real modules, transpiled in place (same loader shape as setup.test.mjs).
// Type-only imports vanish in transpilation, so these stay dependency-free.
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
const { inboundKeyword, isStopMessage, twilioAnswers, keywordReply } = load('../../src/lib/notify/keywords.ts');
const { phoneVariants, optOutSender, accountsForSender, accountLanguage, replyLanguage } = load('../../src/lib/notify/inbound.ts');
const { storablePhone, alertsFormDirty, hasActiveConsent, EMPTY_NOTIFICATION_PREFS } = load('../../src/lib/notify/types.ts');
const { renderSms } = load('../../src/lib/notify/sms-templates.ts');
const { smsSegments } = load('../../src/lib/notify/sms.ts');

/** The vm realm's objects carry another Object.prototype: compare as JSON. */
const same = (actual, expected, message) =>
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);

test('keywords: the full EN/ES/PT opt-out set, folded for case and accents', () => {
  const cases = {
    en: ['STOP', ' stop. ', 'Stop!', 'stopall', 'Unsubscribe', 'cancel', 'END', 'quit', 'revoke', 'opt out', 'Opt-Out', 'OPTOUT'],
    es: ['parar', 'ALTO', 'baja', 'Cancelar', 'salir', 'Detener', 'détener', 'SALÍR'],
    pt: ['pare', 'PÁRE', 'sair', 'Descadastrar', 'SAIR!'],
  };
  // Spanish AND Portuguese: the map's language is only their default.
  const shared = new Set(['parar', 'Cancelar', 'pare', 'PÁRE']);
  for (const [lang, texts] of Object.entries(cases)) {
    for (const text of texts) {
      same(inboundKeyword(text), shared.has(text) ? { kind: 'stop', lang, shared: true } : { kind: 'stop', lang }, text);
      assert.equal(isStopMessage(text), true, text);
    }
  }
});

test('keywords: an opt-out word anywhere in the message counts; look-alikes do not', () => {
  for (const text of ['please stop texting me', 'I want to END this', 'pare por favor', 'Quiero darme de baja', 'stop, help']) {
    assert.equal(isStopMessage(text), true, text);
  }
  // Whole words only, and nothing the Object prototype knows.
  for (const text of ['weekend', 'stopped', 'para mañana', 'optional output', 'thanks!', '', '   ', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.equal(inboundKeyword(text), null, JSON.stringify(text));
  }
});

test('keywords: HELP/AYUDA/AJUDA ask for help, and opt-out beats help in one message', () => {
  same(inboundKeyword('HELP'), { kind: 'help', lang: 'en' });
  same(inboundKeyword('ayuda por favor'), { kind: 'help', lang: 'es' });
  same(inboundKeyword('Ajuda!'), { kind: 'help', lang: 'pt' });
  same(inboundKeyword('help me stop these'), { kind: 'stop', lang: 'en' });
  assert.equal(isStopMessage('help'), false);
});

test('keywords: only a bare Twilio keyword is left to Twilio (no double reply)', () => {
  for (const text of ['STOP', ' stop. ', 'Unsubscribe', 'END', 'quit', 'cancel', 'stopall', 'HELP', 'info']) {
    assert.equal(twilioAnswers(text), true, text);
  }
  for (const text of ['stop texting me', 'parar', 'opt out', 'revoke', 'ayuda', 'ajuda', 'help please', '']) {
    assert.equal(twilioAnswers(text), false, text);
  }
});

test('keywords: replies name the brand, give the address or the way back, and stay short', () => {
  for (const lang of ['en', 'es', 'pt']) {
    const help = keywordReply({ kind: 'help', lang });
    const stop = keywordReply({ kind: 'stop', lang });
    for (const reply of [help, stop]) {
      assert.match(reply, /contado/, reply);
      assert.ok(smsSegments(reply) <= 2, `${reply} is ${smsSegments(reply)} segments`);
    }
    assert.match(help, /mail@getcontado\.com/);
    assert.match(help, /STOP/);
  }
  assert.equal(keywordReply({ kind: 'help', lang: 'en' }), 'contado alerts: help at mail@getcontado.com. Reply STOP to cancel.');
  // English stays in GSM-7: one segment each.
  assert.equal(smsSegments(keywordReply({ kind: 'help', lang: 'en' })), 1);
  assert.equal(smsSegments(keywordReply({ kind: 'stop', lang: 'en' })), 1);
});

test('inbound: a sender matches every form its number may be stored in', () => {
  // WhatsApp reports a Mexican mobile as 521 + ten digits; its E.164 is +52 + ten.
  same(phoneVariants('5215512345678'), ['+5215512345678', '+525512345678']);
  same(phoneVariants('+525512345678'), ['+525512345678', '+5215512345678']);
  // A Brazilian account made before the ninth digit, and the other way round.
  same(phoneVariants('551187654321'), ['+551187654321', '+5511987654321']);
  same(phoneVariants('+5511987654321'), ['+5511987654321', '+551187654321']);
  // A Brazilian landline (no 6–9 start) and a US number have one form.
  same(phoneVariants('551132654321'), ['+551132654321']);
  same(phoneVariants('+15551234567'), ['+15551234567']);
  same(phoneVariants('not a number'), []);
});

/** A PostgREST stand-in: an update or select over rows filtered by `in`. */
const fakeDb = (rows, { fail = false, users = {} } = {}) => {
  const query = () => {
    const state = { update: null, in: null };
    const run = () => {
      if (fail) return { data: null, error: { message: 'boom' } };
      const hit = rows.filter((row) => state.in.values.includes(row[state.in.column]));
      if (state.update) for (const row of hit) Object.assign(row, state.update);
      return { data: hit.map((row) => ({ account_id: row.account_id })), error: null };
    };
    const chain = {
      update: (values) => ((state.update = values), chain),
      in: (column, values) => ((state.in = { column, values }), chain),
      select: () => chain,
      then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
    };
    return chain;
  };
  return {
    from: () => query(),
    auth: {
      admin: {
        getUserById: (id) => {
          // The real one throws, not resolves, on an id that isn't a uuid.
          if (users[id] === 'throws') throw new Error('Expected parameter to be UUID but is not');
          return Promise.resolve(
            id in users
              ? { data: { user: { user_metadata: users[id] } }, error: null }
              : { data: { user: null }, error: { message: 'not found' } },
          );
        },
      },
    },
  };
};

test('inbound: a STOP lands on the row stored in another form, and a miss is reported, not hidden', async () => {
  const rows = [
    { account_id: 'mx', phone: '+525512345678', opted_out_at: null },
    { account_id: 'us', phone: '+15551234567', opted_out_at: null },
  ];
  const hit = await optOutSender(fakeDb(rows), '+5215512345678');
  same(hit, { ok: true, accountIds: ['mx'] });
  assert.ok(rows[0].opted_out_at, 'the Mexican row is stamped');
  assert.equal(rows[1].opted_out_at, null, 'nobody else is');
  // No row under any form: ok, but nothing changed — the webhook logs the miss.
  same(await optOutSender(fakeDb(rows), '+447700900123'), { ok: true, accountIds: [] });
  // A failed write is not a success (no confirmation goes out).
  same(await optOutSender(fakeDb(rows, { fail: true }), '+15551234567'), { ok: false, error: 'boom' });
  same(await accountsForSender(fakeDb(rows), '551187654321'), []);
  same(await accountsForSender(fakeDb(rows), '15551234567'), ['us']);
});

test('inbound: replies answer in the account\'s language, then the sender\'s own words', async () => {
  const db = fakeDb([], { users: { a: { lang: 'es' }, b: {}, c: { lang: 'pt' }, d: 'throws' } });
  assert.equal(await accountLanguage(db, ['b', 'a']), 'es');
  assert.equal(await accountLanguage(db, ['missing', 'c']), 'pt');
  // A failed lookup falls back; it never stops the reply after the opt-out landed.
  assert.equal(await accountLanguage(db, ['d']), null);
  assert.equal(await accountLanguage(db, []), null);

  const stop = inboundKeyword('STOP');
  const help = inboundKeyword('HELP');
  // Every contado text says "reply STOP/HELP": an English keyword is the account's language.
  assert.equal(replyLanguage(stop, 'es', '+15551234567'), 'es');
  assert.equal(replyLanguage(help, 'pt', '+15551234567'), 'pt');
  assert.equal(replyLanguage(stop, null, '+5511987654321'), 'pt');
  assert.equal(replyLanguage(stop, null, '+15551234567'), 'en');
  assert.equal(replyLanguage(stop, '__proto__', '+15551234567'), 'en');
  // Spanish- or Portuguese-only words are the sender's own language.
  assert.equal(replyLanguage(inboundKeyword('baja'), 'pt', '+5511987654321'), 'es');
  assert.equal(replyLanguage(inboundKeyword('sair'), 'es', '+15551234567'), 'pt');
  // parar / cancelar / pare are both: the account settles them, else +55 means Portuguese.
  assert.equal(replyLanguage(inboundKeyword('PARAR'), null, '5511987654321'), 'pt');
  assert.equal(replyLanguage(inboundKeyword('cancelar'), 'pt', '+15551234567'), 'pt');
  assert.equal(replyLanguage(inboundKeyword('cancelar'), 'en', '+15551234567'), 'es');
  assert.equal(replyLanguage(inboundKeyword('pare'), 'es', '+15551234567'), 'es');
  for (const lang of ['en', 'es', 'pt']) {
    assert.match(keywordReply({ ...stop, lang: replyLanguage(stop, lang, '+1') }), /contado/);
  }
});

test('storablePhone: a number is kept only with a ticked box on an active channel, and only well-formed', () => {
  const at = '2026-10-08T12:00:00.000Z';
  const prefs = (over) => ({ ...EMPTY_NOTIFICATION_PREFS, ...over });
  // The live bug: Off, or no consent, used to store whatever sat in the field.
  assert.equal(storablePhone(prefs({ channel: 'off', phone: '+15551234567' })), '');
  assert.equal(storablePhone(prefs({ channel: 'off', phone: '+15551234567', whatsappConsentAt: at, smsConsentAt: at })), '');
  assert.equal(storablePhone(prefs({ channel: 'whatsapp', phone: '+15551234567' })), '');
  // Consent is per channel: an SMS tick does not keep a WhatsApp number.
  assert.equal(storablePhone(prefs({ channel: 'whatsapp', phone: '+15551234567', smsConsentAt: at })), '');
  assert.equal(storablePhone(prefs({ channel: 'whatsapp', phone: '+15551234567', whatsappConsentAt: at })), '+15551234567');
  assert.equal(storablePhone(prefs({ channel: 'sms', phone: '  +5511987654321 ', smsConsentAt: at })), '+5511987654321');
  // Format is checked even with consent.
  for (const bad of ['5551234567', '+1 555 123 4567', '+0551234567', '+1555', 'call me', '']) {
    assert.equal(storablePhone(prefs({ channel: 'sms', phone: bad, smsConsentAt: at })), '', bad);
  }
});

test('alertsFormDirty: Save opens dark for every stored row, STOPped ones included, and lights on a real change', () => {
  const prefs = (over) => ({ ...EMPTY_NOTIFICATION_PREFS, ...over });
  const opened = (p) => ({ channel: p.channel, phone: p.phone, consent: hasActiveConsent(p) });
  const rows = {
    fresh: prefs({}),
    active: prefs({ channel: 'sms', phone: '+15551234567', smsConsentAt: '2026-09-01T00:00:00.000Z' }),
    // The review's row: consent stamped, then STOP texted — number and channel kept.
    stopped: prefs({ channel: 'sms', phone: '+15551234567', smsConsentAt: '2026-09-01T00:00:00.000Z', optedOutAt: '2026-09-15T00:00:00.000Z' }),
    legacyOff: prefs({ channel: 'off', phone: '+15551234567', whatsappConsentAt: '2026-09-01T00:00:00.000Z' }),
  };
  for (const [name, row] of Object.entries(rows)) {
    assert.equal(alertsFormDirty(row, opened(row)), false, `${name} opens with Save dark`);
  }
  const stopped = rows.stopped;
  // Re-ticking is the re-opt-in; picking Off clears the kept number.
  assert.equal(alertsFormDirty(stopped, { ...opened(stopped), consent: true }), true);
  assert.equal(alertsFormDirty(stopped, { ...opened(stopped), channel: 'off' }), true);
  // Typing in the field changes nothing the save would store while the box is unticked.
  assert.equal(alertsFormDirty(stopped, { ...opened(stopped), phone: '+15559999999' }), false);
  // A channel picked without the tick saves Off: nothing to save from Off.
  assert.equal(alertsFormDirty(rows.fresh, { channel: 'whatsapp', phone: '+15551234567', consent: false }), false);
  assert.equal(alertsFormDirty(rows.fresh, { channel: 'whatsapp', phone: '+15551234567', consent: true }), true);
  // After a save that turned alerts Off, the form still showing SMS and a number stays dark.
  assert.equal(alertsFormDirty(prefs({}), { channel: 'sms', phone: '+15551234567', consent: false }), false);
  // A live channel: unticking, or a new number, is a change.
  assert.equal(alertsFormDirty(rows.active, { ...opened(rows.active), consent: false }), true);
  assert.equal(alertsFormDirty(rows.active, { ...opened(rows.active), phone: ' +15559999999 ' }), true);
  assert.equal(alertsFormDirty(rows.active, { ...opened(rows.active), phone: ' +15551234567 ' }), false);
});

test('sms templates: every body opens with "contado: ", carries STOP, and stays within two segments', () => {
  const variables = {
    owed_aging: ['Maria', '$1,240.00', 'Ana Lucía', 'Sep 30'],
    payment_matched: ['Maria', '$1,240.00', 'Ana Lucía'],
    monthly_recap: ['September', '$12,345.67', '$1,234.56', '$11,111.11'],
  };
  for (const [event, vars] of Object.entries(variables)) {
    for (const lang of ['en', 'es', 'pt']) {
      const body = renderSms(event, lang, vars);
      assert.ok(body.startsWith('contado: '), body);
      assert.match(body, /STOP/, body);
      assert.doesNotMatch(body, /\{\d\}/, body);
      assert.ok(smsSegments(body) <= 2, `${body} is ${smsSegments(body)} segments`);
    }
  }
});
