import { dedupe } from "./dedupe";
import { mockExtractor } from "./mock";
import { openAiExtractor } from "./openai";
import type {
  ExtractionContext,
  ExtractionInput,
  ExtractionResult,
  Extractor,
} from "./types";

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
  context: ExtractionContext,
  provider = activeProviderName(),
): Promise<ExtractionResult> => {
  const result = await getExtractor(provider).extract(inputs, context);

  // A warning's filename is model output, and the UI renders it inside
  // first-party chrome (the warning banner) — keep it only when it names an
  // actual upload from this request, so a provider can't inject arbitrary
  // text there. Done here, next to dedupe, so no caller can forget it either.
  const uploadedFilenames = new Set(
    inputs.flatMap((input) => (input.kind === "image" ? [input.filename] : [])),
  );
  const warnings = result.warnings.map((warning) => ({
    ...warning,
    filename:
      warning.filename !== undefined && uploadedFilenames.has(warning.filename)
        ? warning.filename
        : undefined,
  }));

  return { ...result, transactions: dedupe(result.transactions), warnings };
};

export type { ExtractionContext, ExtractionInput, ExtractionResult, Extractor };
