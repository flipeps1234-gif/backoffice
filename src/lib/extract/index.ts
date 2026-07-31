import { dedupe } from "./dedupe";
import { mockExtractor } from "./mock";
import { openAiExtractor } from "./openai";
import type { ExtractionInput, ExtractionResult, Extractor } from "./types";

/**
 * One entry point. Swap the provider here and nothing else in the app changes.
 * Additional providers get registered in this map as we bake them off on /eval.
 */

const PROVIDERS: Record<string, Extractor> = {
  mock: mockExtractor,
  openai: openAiExtractor,
};

/** EXTRACT_PROVIDER wins; otherwise use a real one only if there's a key for it. */
export const activeProviderName = (): string =>
  process.env.EXTRACT_PROVIDER ?? (process.env.OPENAI_API_KEY ? "openai" : "mock");

export const getExtractor = (name = activeProviderName()): Extractor => {
  const extractor = PROVIDERS[name];
  if (!extractor) {
    throw new Error(
      `Unknown extraction provider "${name}". Known: ${Object.keys(PROVIDERS).join(", ")}`,
    );
  }
  return extractor;
};

/** Dedupe happens here so no caller can forget it. */
export const extract = async (
  inputs: ExtractionInput[],
  provider = activeProviderName(),
): Promise<ExtractionResult> => {
  const result = await getExtractor(provider).extract(inputs);
  return { ...result, transactions: dedupe(result.transactions) };
};

export type { ExtractionInput, ExtractionResult, Extractor };
