import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

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
const { messages: site } = load('../../src/lib/messages/site.ts');
const { messages: landing } = load('../../src/lib/messages/landing.ts');
const { OG_IMAGE_TEXT } = (() => {
  // seo.ts imports ./site for SITE_NAME/absolute; the share-card words need neither.
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL('../../src/lib/seo.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: (id) => { if (id === './site') return { SITE_NAME: 'contado', absolute: (p) => p }; throw new Error(`seo.ts imports ${id}`); } },
  );
  return exports;
})();

const LANGS = ['en', 'es', 'pt'];
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('every site.* and landing.* string exists in EN, ES and PT with the same {placeholders}', () => {
  for (const [key, entry] of Object.entries({ ...site, ...landing })) {
    for (const lang of LANGS) {
      assert.equal(typeof entry[lang], 'string', `${key}.${lang}`);
      assert.ok(entry[lang].trim().length > 0, `${key}.${lang} is empty`);
    }
    assert.equal(placeholders(entry.es), placeholders(entry.en), `${key}: es placeholders`);
    assert.equal(placeholders(entry.pt), placeholders(entry.en), `${key}: pt placeholders`);
  }
});

// The owner's decision (2026-10-08): everything is free during the preview;
// current users keep what they use today; paid modules come later, for new
// users; the founding members' one price covers the modules.
test('/pricing and the FAQ say the owner\'s four points', () => {
  for (const key of ['site.pricingIntro', 'site.faq1A']) {
    const en = site[key].en;
    assert.match(en, /everything in contado is free during the preview/i, key);
    assert.match(en, /you keep what you use today/, key);
    assert.match(en, /paid modules come later, for new users/i, key);
    assert.match(en, /covers the modules/, key);
  }
  assert.equal(site['site.pricingTitle'].en, 'Free during preview.');
  // The promise to current users, kept word for word.
  assert.match(site['site.laterIntro'].en, /what's free for you today stays free for you/);
  assert.match(site['site.laterIntro'].en, /paid for new users/);
  assert.match(site['site.laterTitle'].en, /for new users/);
  // The founding price wording: one price, $6/mo, forever, never rises.
  assert.match(site['site.laterNote'].en, /one price that covers all four modules — \$6\/mo, forever, a price that never rises/);
  assert.match(landing['landing.ctaTitle'].en, /\$6\/mo locked forever/);
  assert.match(landing['landing.ctaBody'].en, /free during the preview/);
});

test('nothing on the site still says the old, contradictory things', () => {
  const stale = [
    /while we build/i, /mientras lo construimos/i, /enquanto construímos/i,
    /for all of it/i, /precio por todo/i, /preço único por tudo/i,
    /no limits/i, /nothing gated/i,
    /one-tap matching/i, /emparejado de un toque/i, /conciliação de um toque/i,
  ];
  for (const [key, entry] of Object.entries({ ...site, ...landing })) {
    for (const lang of LANGS) {
      for (const pattern of stale) assert.doesNotMatch(entry[lang], pattern, `${key}.${lang}`);
    }
  }
  // The hero (and the share card that mirrors it) is free DURING the preview, never a bare "Free."
  assert.match(landing['landing.heroSub'].en, /Free during preview\.$/);
  assert.equal(OG_IMAGE_TEXT.sub, landing['landing.heroSub'].en);
});

test('the free-forever list holds no module feature: matching there is by hand, automatic matching is Autopilot\'s', () => {
  const freeForever = ['site.free1', 'site.free2', 'site.free3', 'site.free4', 'site.free5'].map((key) => site[key].en).join(' ');
  assert.doesNotMatch(freeForever, /automatic|clears itself|recurring|reminder|alert|margin|year in review|version history|restore/i);
  assert.match(site['site.free2'].en, /matching by hand/);
  assert.match(site['site.modAutopilot'].en, /automatic matching, Owed that clears itself, recurring jobs/);
});

test('the pricing copy never mentions Teams (not part of this release)', () => {
  const pricing = Object.entries({ ...site, ...landing }).filter(([key]) =>
    /^site\.(pricing|free|later|mod|filter|faq1)|^landing\.(hero|cta)/.test(key));
  assert.ok(pricing.length > 15);
  for (const [key, entry] of pricing) {
    for (const lang of LANGS) assert.doesNotMatch(entry[lang], /\bteams?\b|equipos?\b|equipes?\b/i, `${key}.${lang}`);
  }
});
