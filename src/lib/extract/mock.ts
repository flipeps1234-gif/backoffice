import { validateExtraction } from "./validate";
import type { ExtractionInput, Extractor } from "./types";

/**
 * A provider that invents plausible rows so the whole flow is testable with no
 * API key and no network. Deterministic: same filename in, same rows out.
 *
 * Name a test file with "social" in it to exercise the Venmo-feed warning.
 */

const PAYERS = [
  "Maria Santos",
  "Dave Kim",
  "Priya Raghavan",
  "Thomas Oyelaran",
  "Alicia Ferrer",
  "Sam Whitfield",
];

const MEMOS = ["", "driveway", "monthly", "back yard", "thanks!", ""];

/** Cheap deterministic hash so results are stable across reloads. */
const hash = (text: string): number => {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 100000;
  return value;
};

const rowsFor = (label: string, offset: number) => {
  const seed = hash(label);
  const count = 3 + (seed % 3);

  return Array.from({ length: count }, (_, index) => {
    const n = seed + index * 7919;
    const day = 1 + (n % 27);
    // Every fourth row is deliberately shaky, so the sheet has something to flag.
    const shaky = (n + offset) % 4 === 0;

    return {
      payer: PAYERS[n % PAYERS.length],
      amountCents: (20 + (n % 180)) * 100 + (n % 4) * 25,
      date: `2026-07-${String(day).padStart(2, "0")}`,
      memo: MEMOS[n % MEMOS.length],
      confidence: {
        payer: shaky ? 0.52 : 0.97,
        amountCents: shaky ? 0.61 : 0.99,
        date: shaky ? 0.44 : 0.95,
      },
    };
  });
};

export const mockExtractor: Extractor = {
  name: "mock",

  async extract(inputs: ExtractionInput[]) {
    const transactions: unknown[] = [];
    const warnings: unknown[] = [];

    inputs.forEach((input, offset) => {
      const label = input.kind === "image" ? input.filename : input.text;

      if (/social/i.test(label)) {
        warnings.push({ code: "no_amounts_visible", filename: label });
        return;
      }
      transactions.push(...rowsFor(label, offset));
    });

    return validateExtraction({ transactions, warnings });
  },
};
