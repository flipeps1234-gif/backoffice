import type { Transaction } from "@/lib/transaction";

/**
 * The extraction contract. Every provider implements this and nothing else,
 * so we can bake off OpenAI / Anthropic / Gemini on /eval by swapping one line.
 */

export type ExtractionInput =
  | { kind: "image"; mediaType: string; base64: string; filename: string }
  | { kind: "text"; text: string };

/** Named failure modes. Never fail silently — every one has a user-facing message. */
export type ExtractionWarningCode =
  | "no_amounts_visible"
  | "not_a_payment_feed"
  | "unreadable";

export type ExtractionWarning = {
  code: ExtractionWarningCode;
  /** Which upload it came from, so the UI can point at the right screenshot. */
  filename?: string;
};

export type ExtractionResult = {
  transactions: Transaction[];
  warnings: ExtractionWarning[];
};

/** What the caller knows that the images do not: which calendar day the
 *  uploader is on (src/lib/extract/today.ts). Providers that resolve
 *  relative dates must use it; the mock ignores it. */
export type ExtractionContext = {
  today: string;
};

export type Extractor = {
  name: string;
  extract(inputs: ExtractionInput[], context: ExtractionContext): Promise<ExtractionResult>;
};

export const warningMessage = (warning: ExtractionWarning): string => {
  switch (warning.code) {
    case "no_amounts_visible":
      return "This looks like the Venmo social feed, which hides amounts. Screenshot your Transactions tab instead.";
    case "not_a_payment_feed":
      return "We couldn't find a payment list in this image.";
    case "unreadable":
      return "This image was too blurry or too small to read. Try again, closer.";
  }
};
