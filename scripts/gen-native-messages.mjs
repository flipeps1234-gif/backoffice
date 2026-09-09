#!/usr/bin/env node
/**
 * Generates the native app's messages.json from the web message fragments.
 *
 * src/lib is the spec: every user-visible string lives in
 * src/lib/messages/*.ts with EN, ES and PT texts, merged by src/lib/i18n.ts.
 * The SwiftUI app reads the SAME dictionary from a JSON file that is
 * GENERATED here and never hand-edited — one source, no drift.
 *
 * Loader: the same TypeScript transpileModule + vm pattern tests/security
 * use, so no bundler and no build step. i18n.ts is transpiled to CommonJS
 * and run in a fresh context whose `require` resolves the fragments the
 * same way (relative .ts files, transpiled on demand); everything else is
 * refused, so a stray import into the dictionary fails loudly here rather
 * than silently shipping an incomplete file.
 *
 * Usage:  node scripts/gen-native-messages.mjs <output.json>
 *         npm run gen:native-messages -- "<path to native>/messages.json"
 *
 * Output: {"key": {"en": "...", "es": "...", "pt": "..."}}, keys sorted,
 * 2-space indent, trailing newline.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(ROOT, "src", "lib", "i18n.ts");

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/gen-native-messages.mjs <output.json>");
  process.exit(2);
}

const cache = new Map();

/** Transpile one .ts file and evaluate it as CommonJS, resolving its relative imports the same way. */
function load(file) {
  const cached = cache.get(file);
  if (cached) return cached;
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: file,
  }).outputText;
  vm.runInNewContext(
    code,
    {
      exports,
      require: (id) => {
        if (!id.startsWith(".")) {
          throw new Error(`${path.relative(ROOT, file)} imports "${id}" — the dictionary must stay dependency-free`);
        }
        return load(path.resolve(path.dirname(file), `${id}.ts`));
      },
    },
    { filename: file },
  );
  return exports;
}

const { MESSAGES, LOCALES } = load(ENTRY);
if (!MESSAGES || typeof MESSAGES !== "object") throw new Error("i18n.ts exported no MESSAGES");

const out = {};
for (const key of Object.keys(MESSAGES).sort()) {
  const entry = MESSAGES[key];
  for (const locale of LOCALES) {
    if (typeof entry[locale] !== "string") throw new Error(`${key} has no "${locale}" text`);
  }
  out[key] = { en: entry.en, es: entry.es, pt: entry.pt };
}

mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${Object.keys(out).length} keys → ${target}`);
