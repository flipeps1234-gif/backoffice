/**
 * Notifications SPIKE (dark) — the shapes. This is the Alerts module's
 * skeleton from the monetization roadmap, built as plumbing only:
 * WHATSAPP_ENABLED is false in production, so nothing sends there.
 *
 * Three event types and no more — each maps to exactly one approved-
 * template draft in templates/whatsapp/:
 *   owed_aging      — a sale crossed OWED_FLAG_DAYS unpaid.
 *   payment_matched — the engine linked an ingested payment to a sale.
 *   monthly_recap   — last month's numbers, the in-app recap's sibling.
 */

export type NotificationEvent =
  | "owed_aging"
  | "payment_matched"
  | "monthly_recap";

export type NotifyChannel = "whatsapp" | "sms" | "off";

export type SendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; skipped: true }
  | { ok: false; skipped?: false; error: string };

export type NotificationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "undelivered"
  | "failed"
  | "skipped";

export type QueuedNotification = {
  id: string;
  accountId: string;
  channel: Exclude<NotifyChannel, "off">;
  event: NotificationEvent;
  toNumber: string;
  template: string;
  /** Positional variables ({{1}}, {{2}}…). MINIMAL data: first names
   *  and amounts only — never memos, notes or line items. */
  variables: string[];
  /** The client an owed_aging alert concerns — the frequency cap's key. */
  clientId: string | null;
  status: NotificationStatus;
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type NotificationPrefs = {
  /** The ONE active channel. "off" is the default and the reset state. */
  channel: NotifyChannel;
  phone: string;
  /** When the opt-in box was ticked FOR WHATSAPP. null = never. */
  whatsappConsentAt: string | null;
  /** When the opt-in box was ticked FOR SMS. Separate proof — agreeing
   *  to WhatsApp is not agreeing to SMS. */
  smsConsentAt: string | null;
  /** An inbound STOP (either channel). Wins until re-opted-in. */
  optedOutAt: string | null;
};

export const EMPTY_NOTIFICATION_PREFS: NotificationPrefs = {
  channel: "off",
  phone: "",
  whatsappConsentAt: null,
  smsConsentAt: null,
  optedOutAt: null,
};

/** Loose E.164 check — enough to catch typos, not a dialing plan. */
export const looksLikeE164 = (phone: string): boolean =>
  /^\+[1-9]\d{6,14}$/.test(phone);

/** The active channel's consent timestamp, or null. */
export const activeConsentAt = (prefs: NotificationPrefs): string | null =>
  prefs.channel === "whatsapp"
    ? prefs.whatsappConsentAt
    : prefs.channel === "sms"
      ? prefs.smsConsentAt
      : null;

/** Consent that stands for the ACTIVE channel: ticked, not since STOPped. */
export const hasActiveConsent = (prefs: NotificationPrefs): boolean => {
  const consentAt = activeConsentAt(prefs);
  return (
    consentAt !== null &&
    (prefs.optedOutAt === null || prefs.optedOutAt < consentAt)
  );
};
