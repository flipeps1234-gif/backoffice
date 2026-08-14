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
 * Free-form text sends are deliberately NOT implemented — outside a
 * 24-hour customer-service window only approved templates deliver, and
 * this product only ever speaks in templates.
 */
export const sendWhatsAppTemplate = async (
  toNumber: string,
  template: string,
  variables: string[],
  lang: string,
): Promise<SendResult> => {
  if (!whatsappEnabled()) return { ok: false, skipped: true };

  const response = await fetch(
    `${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
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

/** "stop", "parar", "alto", with punctuation/case noise — an opt-out. */
export const isStopMessage = (text: string): boolean => {
  const bare = text.trim().toLowerCase().replace(/[!.\s]+$/g, "");
  return ["stop", "parar", "pare", "alto", "baja", "cancelar"].includes(bare);
};
