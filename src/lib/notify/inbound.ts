import type { SupabaseClient } from "@supabase/supabase-js";
import type { InboundKeyword, KeywordLang } from "./keywords";

/**
 * Who sent an inbound STOP or HELP, and what language to answer in — ONE
 * module for both webhooks (sms, whatsapp), next to keywords.ts.
 *
 * The sender's number does not always arrive in the form the owner typed.
 * WhatsApp reports a Mexican mobile as 521 + ten digits while its E.164 is
 * +52 + ten digits, and a Brazilian account made before the ninth digit as
 * 55 + area + eight digits. An exact match missed those rows — and an
 * update that changes nothing is not an error to PostgREST, so the sender
 * was told "you're unsubscribed" while the alerts kept coming (2026-10-08
 * review). So the write matches every form of the number and reads back
 * the rows it changed.
 *
 * Only type imports: the unit tests load this file as is.
 */

/** Every form one sender's number may be stored in, its own E.164 first. */
export const phoneVariants = (sender: string): string[] => {
  const digits = sender.replace(/\D/g, "");
  if (!digits) return [];
  const forms = new Set([`+${digits}`]);
  // Mexico: +52 and ten digits; WhatsApp (and dialing before 2019) puts a
  // 1 after the 52 for a mobile.
  const mexico = /^52(1?)(\d{10})$/.exec(digits);
  if (mexico) forms.add(mexico[1] ? `+52${mexico[2]}` : `+521${mexico[2]}`);
  // Brazil: a mobile is the area code, a 9, then eight digits; an account
  // registered before the ninth digit keeps the eight (mobiles began 6–9).
  const withNine = /^55(\d{2})9(\d{8})$/.exec(digits);
  if (withNine) forms.add(`+55${withNine[1]}${withNine[2]}`);
  const withoutNine = /^55(\d{2})([6-9]\d{7})$/.exec(digits);
  if (withoutNine) forms.add(`+55${withoutNine[1]}9${withoutNine[2]}`);
  return [...forms];
};

export type OptOutResult =
  | { ok: true; accountIds: string[] }
  | { ok: false; error: string };

/**
 * Stamps opted_out_at on every prefs row stored under any form of the
 * sender's number. `accountIds` are the rows it changed: none means no
 * prefs row holds the number in any form, so nothing alerts it — the
 * confirmation is still true, and the caller logs the miss.
 */
export const optOutSender = async (
  db: SupabaseClient,
  sender: string,
): Promise<OptOutResult> => {
  const variants = phoneVariants(sender);
  if (variants.length === 0) return { ok: true, accountIds: [] };
  const { data, error } = await db
    .from("notification_prefs")
    .update({ opted_out_at: new Date().toISOString() })
    .in("phone", variants)
    .select("account_id");
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    accountIds: ((data ?? []) as { account_id: string }[]).map((row) => row.account_id),
  };
};

/** The accounts whose prefs hold any form of the sender's number. */
export const accountsForSender = async (
  db: SupabaseClient,
  sender: string,
): Promise<string[]> => {
  const variants = phoneVariants(sender);
  if (variants.length === 0) return [];
  const { data, error } = await db
    .from("notification_prefs")
    .select("account_id")
    .in("phone", variants);
  if (error) return [];
  return ((data ?? []) as { account_id: string }[]).map((row) => row.account_id);
};

/**
 * The app language of the first of these accounts that has one —
 * user_metadata.lang, which the app keeps current with the device's
 * language for the auth emails (upload-screen.tsx). null when none does,
 * or the lookup fails — it throws on an id that isn't a uuid — so the
 * reply falls back instead of never going out after the opt-out landed.
 */
export const accountLanguage = async (
  db: SupabaseClient,
  accountIds: string[],
): Promise<string | null> => {
  // A number is one person's; a handful of rows at most is plenty to read.
  for (const id of accountIds.slice(0, 3)) {
    try {
      const { data, error } = await db.auth.admin.getUserById(id);
      if (error) continue;
      const lang: unknown = data.user?.user_metadata?.lang;
      if (typeof lang === "string") return lang;
    } catch {
      continue;
    }
  }
  return null;
};

/**
 * The language a keyword reply goes out in. Every contado text in all three
 * languages — the consent boxes, the alert templates — says to reply STOP
 * or HELP, so an English keyword says nothing about its sender: it gets the
 * account's language (then Portuguese for a Brazilian number, then
 * English). A Spanish or Portuguese word is the sender's own language —
 * except parar, cancelar and pare, which are both: the account settles
 * those when it reads Spanish or Portuguese, else +55 means Portuguese.
 */
export const replyLanguage = (
  keyword: InboundKeyword,
  accountLang: string | null,
  sender: string,
): KeywordLang => {
  const account =
    accountLang === "en" || accountLang === "es" || accountLang === "pt"
      ? accountLang
      : null;
  const brazil = sender.replace(/\D/g, "").startsWith("55");
  if (keyword.shared) {
    if (account === "es" || account === "pt") return account;
    return brazil ? "pt" : keyword.lang;
  }
  if (keyword.lang !== "en") return keyword.lang;
  return account ?? (brazil ? "pt" : "en");
};
