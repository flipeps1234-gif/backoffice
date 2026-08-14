import { renderSms } from "./sms-templates";
import { sendSms } from "./sms";
import { sendWhatsAppTemplate } from "./whatsapp";
import {
  hasActiveConsent,
  type NotificationEvent,
  type NotificationPrefs,
  type SendResult,
} from "./types";

/**
 * The ONE send pipeline — no forked logic. Events don't know channels;
 * the user's pref picks the sender at send time. Adding a channel is
 * one sender module + one case here, and every event gets it for free.
 */

/** Meta template names per event (as drafted in templates/whatsapp/). */
const WHATSAPP_TEMPLATE: Record<NotificationEvent, string> = {
  owed_aging: "owed_alert",
  payment_matched: "match_confirm",
  monthly_recap: "monthly_recap",
};

const WHATSAPP_LANG: Record<"en" | "es" | "pt", string> = {
  en: "en",
  es: "es",
  pt: "pt_BR",
};

export const sendViaChannel = async (
  prefs: NotificationPrefs,
  event: NotificationEvent,
  variables: string[],
  lang: "en" | "es" | "pt",
): Promise<SendResult> => {
  // Consent gates EVERY send, before any provider is even chosen.
  if (!hasActiveConsent(prefs) || prefs.phone === "") {
    return { ok: false, skipped: true };
  }

  switch (prefs.channel) {
    case "whatsapp":
      return sendWhatsAppTemplate(
        prefs.phone,
        WHATSAPP_TEMPLATE[event],
        variables,
        WHATSAPP_LANG[lang],
      );
    case "sms":
      return sendSms(prefs.phone, renderSms(event, lang, variables));
    case "off":
      return { ok: false, skipped: true };
  }
};
