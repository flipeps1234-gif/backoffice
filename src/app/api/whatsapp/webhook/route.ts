import { createHmac, timingSafeEqual } from "node:crypto";
import { isStopMessage } from "@/lib/notify/whatsapp";
import { serviceClient } from "@/lib/notify/store";

/**
 * WhatsApp Cloud API webhook — SPIKE (dark).
 *
 * GET  = Meta's one-time subscription handshake (hub.challenge echo,
 *        gated on WHATSAPP_VERIFY_TOKEN).
 * POST = delivery statuses (sent/delivered/read/failed) and inbound
 *        messages. An inbound STOP (or Spanish/Portuguese equivalent)
 *        marks the sender's prefs opted_out — consent dies until the
 *        user explicitly re-opts-in from Settings.
 *
 * Signature: when WHATSAPP_APP_SECRET is set, X-Hub-Signature-256 is
 * verified and a bad signature is rejected. Without the secret, unsigned
 * posts are refused outright in production (503, before any parsing or
 * writes); outside production (bare spike against the test number) they
 * are accepted but say so in the log.
 *
 * Always answers 200 fast — Meta retries non-200s aggressively and a
 * retry storm against a spike helps nobody.
 */

type StatusEntry = {
  id?: string;
  status?: string;
  errors?: { message?: string }[];
};
type MessageEntry = {
  from?: string;
  text?: { body?: string };
  type?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("verification failed", { status: 403 });
}

const signatureValid = async (
  request: Request,
  rawBody: string,
): Promise<boolean | "unsigned"> => {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return "unsigned";
  const header = request.headers.get("x-hub-signature-256") ?? "";
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
};

// Masks a phone number in logs down to its last 4 digits.
const last4 = (n: string) => `***${n.slice(-4)}`;

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signed = await signatureValid(request, rawBody);
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
    console.warn("whatsapp webhook: WHATSAPP_APP_SECRET unset — accepting unsigned POST (spike mode)");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("ok", { status: 200 });
  }

  const db = serviceClient("whatsapp");

  // Meta nests deeply: entry[] → changes[] → value.{statuses,messages}.
  const entries =
    (payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })
      .entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};

      for (const status of (value.statuses as StatusEntry[] | undefined) ?? []) {
        if (!status.id || !status.status) continue;
        const mapped =
          status.status === "failed" ? "undelivered" : status.status;
        // The queue column has a CHECK (0014) narrower than Meta's status
        // vocabulary — 'deleted' and 'warning' are documented Cloud API
        // values that would fail it, erroring the update and silently
        // freezing the row's status. Skip what the schema can't hold.
        if (!["sent", "delivered", "read", "undelivered"].includes(mapped)) {
          console.log(`whatsapp status ignored (not in schema): ${status.status}`);
          continue;
        }
        if (db) {
          const { error } = await db
            .from("notification_queue")
            .update({
              status: mapped,
              error: status.errors?.[0]?.message ?? null,
            })
            .eq("provider_message_id", status.id);
          if (error) console.error("whatsapp status write failed:", error.message);
        } else {
          console.log(
            `whatsapp status (no service key, not saved): ${status.id} → ${mapped}`,
          );
        }
      }

      for (const message of (value.messages as MessageEntry[] | undefined) ?? []) {
        const text = message.text?.body ?? "";
        if (!message.from || message.type !== "text" || !isStopMessage(text)) {
          continue;
        }
        // Their number arrives without "+"; prefs store E.164.
        const e164 = `+${message.from.replace(/^\+/, "")}`;
        if (db) {
          const { error } = await db
            .from("notification_prefs")
            .update({ opted_out_at: new Date().toISOString() })
            .eq("phone", e164);
          if (error) console.error("whatsapp opt-out write failed:", error.message);
          else console.log(`whatsapp STOP honored for ${last4(e164)}`);
        } else {
          console.log(
            `whatsapp STOP (no service key, not saved): ${last4(e164)} asked out`,
          );
        }
      }
    }
  }

  return new Response("ok", { status: 200 });
}
