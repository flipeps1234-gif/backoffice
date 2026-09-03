import { createHmac, timingSafeEqual } from "node:crypto";
import { isStopMessage } from "@/lib/notify/whatsapp";
import { serviceClient } from "@/lib/notify/store";

/**
 * Twilio SMS webhook — SPIKE (dark). One endpoint for both configs:
 * inbound messages (Body/From — STOP handling, mirroring the WhatsApp
 * webhook) and status callbacks (MessageSid/MessageStatus → queue).
 *
 * Signature: Twilio signs POSTs with X-Twilio-Signature = base64
 * HMAC-SHA1(auth token, full URL + form params concatenated sorted by
 * key). Verified when TWILIO_AUTH_TOKEN is set; unsigned posts are
 * refused outright in production (503, before any parsing or writes) —
 * outside production they're accepted with a loud log, same posture as
 * the WhatsApp side.
 *
 * Twilio expects TwiML back; an empty <Response/> means "no reply" —
 * Twilio itself auto-handles the carrier-level STOP keyword, this
 * records OUR copy of the opt-out so the pipeline never queues again.
 */

const twimlEmpty = () =>
  new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });

const signatureValid = (
  request: Request,
  params: URLSearchParams,
): boolean | "unsigned" => {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return "unsigned";
  const header = request.headers.get("x-twilio-signature") ?? "";

  // Twilio signs the URL it was CONFIGURED with — behind Vercel's proxy
  // the request URL is http://, so rebuild from forwarded headers.
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const base = `${proto}://${host}${url.pathname}${url.search}`;

  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const payload = base + sorted.map(([k, v]) => k + v).join("");
  const expected = createHmac("sha1", token).update(payload).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
};

// Masks a phone number in logs down to its last 4 digits.
const last4 = (n: string) => `***${n.slice(-4)}`;

export async function POST(request: Request) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);

  const signed = signatureValid(request, params);
  if (signed === false) {
    return new Response("bad signature", { status: 401 });
  }
  if (signed === "unsigned") {
    // In production an unsigned POST could be anyone — never trust it far
    // enough to parse or write. Non-production (the spike against a test
    // number) keeps warning and continuing.
    if (process.env.NODE_ENV === "production") {
      return new Response("webhook not configured", { status: 503 });
    }
    console.warn("sms webhook: TWILIO_AUTH_TOKEN unset — accepting unsigned POST (spike mode)");
  }

  const db = serviceClient("twilio");

  // Status callback: MessageSid + MessageStatus (queued/sent/delivered/
  // undelivered/failed).
  const messageSid = params.get("MessageSid");
  const messageStatus = params.get("MessageStatus");
  if (messageSid && messageStatus && !params.get("Body")) {
    const mapped =
      messageStatus === "failed" ? "undelivered" : messageStatus;
    // Same guard as the WhatsApp webhook: Twilio's vocabulary is wider
    // than the queue column's CHECK (0014) — 'accepted', 'sending' and
    // 'canceled' would fail it and silently freeze the row's status.
    if (
      !["queued", "sent", "delivered", "read", "undelivered"].includes(mapped)
    ) {
      console.log(`sms status ignored (not in schema): ${messageStatus}`);
      return twimlEmpty();
    }
    if (db) {
      const { error } = await db
        .from("notification_queue")
        .update({
          status: mapped,
          error: params.get("ErrorCode"),
        })
        .eq("provider_message_id", messageSid);
      if (error) console.error("sms status write failed:", error.message);
    } else {
      console.log(
        `sms status (no service key, not saved): ${messageSid} → ${mapped}`,
      );
    }
    return twimlEmpty();
  }

  // Inbound message: STOP (and es/pt equivalents — isStopMessage is
  // shared with the WhatsApp webhook, one opt-out vocabulary).
  const from = params.get("From");
  const body = params.get("Body") ?? "";
  if (from && isStopMessage(body)) {
    if (db) {
      const { error } = await db
        .from("notification_prefs")
        .update({ opted_out_at: new Date().toISOString() })
        .eq("phone", from);
      if (error) console.error("sms opt-out write failed:", error.message);
      else console.log(`sms STOP honored for ${last4(from)}`);
    } else {
      console.log(`sms STOP (no service key, not saved): ${last4(from)} asked out`);
    }
  }

  return twimlEmpty();
}
