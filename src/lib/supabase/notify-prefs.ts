import { getSupabase } from "./client";
import {
  EMPTY_NOTIFICATION_PREFS,
  type NotificationPrefs,
  type NotifyChannel,
} from "@/lib/notify/types";

type Row = {
  channel: string;
  phone: string;
  whatsapp_consent_at: string | null;
  sms_consent_at: string | null;
  opted_out_at: string | null;
};

const asChannel = (raw: string): NotifyChannel =>
  raw === "whatsapp" || raw === "sms" ? raw : "off";

/** Same posture as loadProfile: a FAILED check throws — the caller must
 *  not treat "couldn't look" as "never consented". */
export const loadNotificationPrefs = async (): Promise<NotificationPrefs> => {
  const supabase = getSupabase();
  if (!supabase) return EMPTY_NOTIFICATION_PREFS;

  const { data, error } = await supabase
    .from("notification_prefs")
    .select("channel, phone, whatsapp_consent_at, sms_consent_at, opted_out_at")
    .maybeSingle<Row>();
  if (error) throw new Error(error.message);
  if (!data) return EMPTY_NOTIFICATION_PREFS;
  return {
    channel: asChannel(data.channel),
    phone: typeof data.phone === "string" ? data.phone : "",
    whatsappConsentAt: data.whatsapp_consent_at,
    smsConsentAt: data.sms_consent_at,
    optedOutAt: data.opted_out_at,
  };
};

export const saveNotificationPrefs = async (
  prefs: NotificationPrefs,
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("notification_prefs").upsert({
    account_id: accountId,
    channel: prefs.channel,
    phone: prefs.phone,
    whatsapp_consent_at: prefs.whatsappConsentAt,
    sms_consent_at: prefs.smsConsentAt,
    opted_out_at: prefs.optedOutAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
};
