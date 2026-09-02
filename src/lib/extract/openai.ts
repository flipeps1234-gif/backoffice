import { validateExtraction } from "./validate";
import { weekdayOf } from "./today";
import type { ExtractionContext, ExtractionInput, ExtractionResult, Extractor } from "./types";

/**
 * OpenAI provider. Plain fetch — no SDK, so no new dependency.
 * Runs server-side only; OPENAI_API_KEY never reaches the browser.
 */

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You read financial documents for a very small service business: screenshots of peer-to-peer payment feeds (Venmo, Cash App, Zelle), photographed receipts, photographed checks, and photographed bank statements.

Extract every money movement, with its direction:
- direction "in": payments received. Feed payments TO the user, statement credits/deposits.
- direction "out": money spent. Store receipts (the receipt TOTAL, one transaction per receipt — never line items), statement debits, feed payments the user SENT.
- Checks go EITHER way — read the "Pay to the order of" line. A check made out to the user or their business is "in"; a check the user wrote to someone else is "out". If you cannot tell who the payee is, pick "in" and give it low confidence.
Ignore pending requests and balance figures.

Rules:
- amountCents is an INTEGER of cents. $64.50 is 6450. Never a decimal.
- date is YYYY-MM-DD. If the document shows a relative date ("Today", "Yesterday", "Tuesday", "Jul 3"), resolve it using today's date and weekday, given below. Never use a date later than today. If you cannot determine a date, use an empty string.
- payer is the other party as shown: the person who paid (direction in) or the merchant/payee (direction out). For a check received, the drawer's printed name; for a check the user wrote, the payee line.
- memo is the payment note or receipt description, or an empty string.
- confidence is 0..1 per field: how sure you are that YOU READ IT CORRECTLY. Be honest — photographed paper is often blurry, angled, or handwritten; score low when unsure. This drives what the user is asked to check.

Warnings, when they apply:
- "no_amounts_visible": the image is a social/friends feed that hides amounts.
- "not_a_payment_feed": the image is not a payment list at all.
- "unreadable": too blurry, dark, or small to read.

If you emit a warning for an image, return no transactions for that image.`;

/** JSON Schema the model is constrained to. Strict mode: every field required. */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["transactions", "warnings"],
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["payer", "amountCents", "date", "memo", "direction", "confidence"],
        properties: {
          payer: { type: "string" },
          amountCents: { type: "integer" },
          date: { type: "string" },
          memo: { type: "string" },
          direction: { type: "string", enum: ["in", "out"] },
          confidence: {
            type: "object",
            additionalProperties: false,
            required: ["payer", "amountCents", "date"],
            properties: {
              payer: { type: "number" },
              amountCents: { type: "number" },
              date: { type: "number" },
            },
          },
        },
      },
    },
    warnings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "filename"],
        properties: {
          code: {
            type: "string",
            enum: ["no_amounts_visible", "not_a_payment_feed", "unreadable"],
          },
          filename: { type: "string" },
        },
      },
    },
  },
} as const;

/** Pure so it can be tested without a network call. Never throws. */
export const parseResponse = (body: unknown): ExtractionResult => {
  const content = (body as { choices?: { message?: { content?: unknown } }[] })
    ?.choices?.[0]?.message?.content;

  if (typeof content !== "string") return { transactions: [], warnings: [] };

  try {
    return validateExtraction(JSON.parse(content));
  } catch {
    return { transactions: [], warnings: [{ code: "unreadable" }] };
  }
};

const userContent = (inputs: ExtractionInput[], today: string) => {
  const blocks: unknown[] = [
    {
      type: "text",
      text: `Today is ${today} (${weekdayOf(today)}). ${inputs.length} image(s) follow, in order. Each is preceded by its filename — use that exact filename in any warning.`,
    },
  ];

  for (const input of inputs) {
    if (input.kind === "text") {
      blocks.push({ type: "text", text: input.text });
      continue;
    }
    blocks.push({ type: "text", text: `filename: ${input.filename}` });
    blocks.push({
      type: "image_url",
      image_url: {
        url: `data:${input.mediaType};base64,${input.base64}`,
        detail: "high",
      },
    });
  }
  return blocks;
};

export const openAiExtractor: Extractor = {
  name: "openai",

  async extract(inputs: ExtractionInput[], context: ExtractionContext) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local, or set EXTRACT_PROVIDER=mock.",
      );
    }

    // The UPLOADER's calendar day, resolved by the route from the device's
    // zone (src/lib/extract/today.ts) — never this server's UTC clock, which
    // is tomorrow every evening in the Americas and dated "Today" rows a
    // day late (found by the time/date lens of clean pass 7).
    const today = context.today;

    const response = await fetch(ENDPOINT, {
      method: "POST",
      // Give up before the route's maxDuration (60 s) so a stalled model
      // call ends in our own 502 copy, not a platform timeout — and never
      // holds a 2 GB function open for the 300 s platform default. The
      // other two server-side fetches (notify/sms.ts, notify/whatsapp.ts)
      // carry the same guard at 15 s; keep all three when adding a fourth.
      signal: AbortSignal.timeout(55_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent(inputs, today) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "extraction", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI returned ${response.status}: ${detail.slice(0, 300)}`);
    }

    return parseResponse(await response.json());
  },
};
