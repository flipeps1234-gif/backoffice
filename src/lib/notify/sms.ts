import type { SendResult } from "./types";

/**
 * Twilio SMS sender — SPIKE (dark). Same posture as the WhatsApp
 * sender: official REST API over plain fetch (no SDK dependency),
 * server-only creds, and a hard env gate — SMS_ENABLED=false (or
 * absent) in production means every send resolves {skipped}.
 *
 * Env (server-only, .env.local for the spike):
 *   SMS_ENABLED          "true" to allow sends.
 *   TWILIO_ACCOUNT_SID   The account SID (starts with AC).
 *   TWILIO_AUTH_TOKEN    Auth token — also verifies inbound webhooks.
 *   TWILIO_FROM          The sending number, E.164.
 *
 * PRODUCTION BLOCKER (see CLAUDE.md): US A2P 10DLC registration is
 * required before real traffic — unregistered 10-digit numbers get
 * filtered or blocked by carriers. Start when the entity/EIN exists;
 * sole-prop registration is acceptable at founding-cohort scale.
 */

export const smsEnabled = (): boolean =>
  process.env.SMS_ENABLED === "true" &&
  Boolean(process.env.TWILIO_ACCOUNT_SID) &&
  Boolean(process.env.TWILIO_AUTH_TOKEN) &&
  Boolean(process.env.TWILIO_FROM);

export const sendSms = async (
  toNumber: string,
  body: string,
): Promise<SendResult> => {
  if (!smsEnabled()) return { ok: false, skipped: true };

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(
    `${sid}:${process.env.TWILIO_AUTH_TOKEN}`,
  ).toString("base64");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      // Same rule as the OpenAI call in src/lib/extract/openai.ts: a
      // provider that hangs must not hold a function open until the
      // platform kills it. Twilio answers in well under a second.
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toNumber,
        From: process.env.TWILIO_FROM!,
        Body: body,
      }),
    },
  );

  const data = (await response.json().catch(() => null)) as {
    sid?: string;
    message?: string;
  } | null;

  if (!response.ok || !data?.sid) {
    return { ok: false, error: data?.message ?? `HTTP ${response.status}` };
  }
  return { ok: true, providerMessageId: data.sid };
};

/**
 * SEGMENT MATH — why the SMS templates read the way they do.
 *
 * GSM-7 (plain ASCII + a small extra set): 160 chars in one segment,
 * 153 per segment once concatenated. But ONE character outside GSM-7 —
 * á, é, ç, ã, ñ beyond the basic set, a curly quote, an em dash, an
 * emoji — flips the ENTIRE message to UCS-2: 70 chars per single
 * segment, 67 concatenated. Spanish and Portuguese copy with accents
 * therefore bills 2+ segments where the English fits in one. The
 * templates keep the accents (correct language beats cheap language)
 * but stay SHORT so even UCS-2 fits in ≤2 segments; this estimator is
 * for tests and future cost display, not for mangling words.
 *
 * NB: ñ, é, à ARE in basic GSM-7; á, í, ó, ú, ã, ç are NOT — which is
 * exactly why "sí" is safe and "más" is not. Don't guess: estimate.
 */
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑܧ¿abcdefghijklmnopqrstuvwxyzäöñüà" +
  "^{}\\[~]|€";

export const smsSegments = (body: string): number => {
  const isGsm7 = [...body].every((ch) => GSM7.includes(ch));
  const len = [...body].length;
  if (len === 0) return 0;
  if (isGsm7) return len <= 160 ? 1 : Math.ceil(len / 153);
  return len <= 70 ? 1 : Math.ceil(len / 67);
};
