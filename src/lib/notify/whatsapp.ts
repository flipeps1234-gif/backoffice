/**
 * WhatsApp Cloud API sender — SPIKE (dark). Server-side only: the token
 * never ships to a browser. Official Cloud API over plain fetch — no
 * SDK dependency, no unofficial gateways, ever.
 *
 * Env (server-only, .env.local for the spike; ALL absent in prod):
 *   WHATSAPP_ENABLED          "true" to allow sends. False/absent = every
 *                             send resolves {skipped} — the dark switch.
 *   WHATSAPP_TOKEN            Cloud API access token (test token is fine).
 *   WHATSAPP_PHONE_NUMBER_ID  The sending number's id — Meta's free test
 *                             number for the spike.
 *   WHATSAPP_VERIFY_TOKEN     Webhook handshake secret (any string you
 *                             also paste into the Meta console).
 *   WHATSAPP_APP_SECRET       Optional; enables webhook signature checks.
 */

import type { SendResult } from "./types";

const GRAPH = "https://graph.facebook.com/v20.0";

export const whatsappEnabled = (): boolean =>
  process.env.WHATSAPP_ENABLED === "true" &&
  Boolean(process.env.WHATSAPP_TOKEN) &&
  Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);

/**
 * One template send. `variables` fill {{1}}..{{n}} in order; `lang` is
 * the template's language code (en/es/pt_BR as registered with Meta).
 * Outside a 24-hour customer-service window only approved templates
 * deliver, so every alert is a template. The one free-form send is
 * sendWhatsAppReply below — an answer to a message the person JUST sent.
 */
export const sendWhatsAppTemplate = async (
  toNumber: string,
  template: string,
  variables: string[],
  lang: string,
): Promise<SendResult> => {
  if (!whatsappEnabled()) return { ok: false, skipped: true };

  return postMessage({
    messaging_product: "whatsapp",
    to: toNumber,
    type: "template",
    template: {
      name: template,
      language: { code: lang },
      components:
        variables.length > 0
          ? [
              {
                type: "body",
                parameters: variables.map((text) => ({
                  type: "text",
                  text,
                })),
              },
            ]
          : [],
    },
  });
};

/**
 * A plain-text answer to an inbound message — the HELP reply and the STOP
 * confirmation (keywords.ts). Free-form text is allowed here only because
 * the person's own message opened the 24-hour window a moment ago; nothing
 * else may call this. Same dark switch as the templates.
 */
export const sendWhatsAppReply = async (
  toNumber: string,
  text: string,
): Promise<SendResult> => {
  if (!whatsappEnabled()) return { ok: false, skipped: true };
  return postMessage({
    messaging_product: "whatsapp",
    to: toNumber,
    type: "text",
    text: { body: text },
  });
};

const postMessage = async (payload: object): Promise<SendResult> => {
  const response = await fetch(
    `${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      // Same rule as the OpenAI call in src/lib/extract/openai.ts: a
      // provider that hangs must not hold a function open until the
      // platform kills it. The Graph API answers in well under a second.
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const body = (await response.json().catch(() => null)) as {
    messages?: { id: string }[];
    error?: { message?: string };
  } | null;

  if (!response.ok || !body?.messages?.[0]?.id) {
    return {
      ok: false,
      error: body?.error?.message ?? `HTTP ${response.status}`,
    };
  }
  return { ok: true, providerMessageId: body.messages[0].id };
};
