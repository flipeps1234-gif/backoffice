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
  phone: string;
  /** When the opt-in box was ticked. null = never consented = OFF. */
  whatsappConsentAt: string | null;
  /** An inbound STOP. Wins over consent until explicitly re-opted-in. */
  optedOutAt: string | null;
};

export const EMPTY_NOTIFICATION_PREFS: NotificationPrefs = {
  phone: "",
  whatsappConsentAt: null,
  optedOutAt: null,
};

/** Loose E.164 check — enough to catch typos, not a dialing plan. */
export const looksLikeE164 = (phone: string): boolean =>
  /^\+[1-9]\d{6,14}$/.test(phone);

/** Consent that stands: ticked, not since revoked by STOP. */
export const hasWhatsAppConsent = (prefs: NotificationPrefs): boolean =>
  prefs.whatsappConsentAt !== null &&
  (prefs.optedOutAt === null || prefs.optedOutAt < prefs.whatsappConsentAt);
