import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The engine suite. src/lib is pure TypeScript — no React, no network, no
 * clock — so the tests run in plain Node with no DOM and no setup file.
 *
 * The coverage scope is src/lib MINUS the modules that are not the money
 * engine: the ones that talk to a network or a browser API, and the ones
 * that are pure data (translation tables, type declarations). Every
 * exclusion is justified line by line in COVERAGE.md.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Mirrors tsconfig's "@/*" → "./src/*" so the lib's own imports
      // ("@/lib/transaction" inside extract/) resolve under Vitest.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/__tests__/**",
        // Pure data, no logic: 714 translation strings and type files.
        "src/lib/messages/**",
        "src/lib/extract/types.ts",
        // Network or browser-only, and therefore not the engine:
        "src/lib/supabase/**",
        "src/lib/extract/openai.ts",
        "src/lib/compress-image.ts",
        "src/lib/notify/send.ts",
        "src/lib/notify/sms.ts",
        "src/lib/notify/whatsapp.ts",
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
