import type { NotificationEvent } from "./types";

/**
 * SMS variants of the three templates — short and plain on purpose:
 * SMS has no formatting, no branding, and a per-segment price (see the
 * segment math in sms.ts — accents flip the whole message to UCS-2 at
 * 70/67 chars per segment, so every extra word is money). Same
 * MINIMAL-data rule as WhatsApp: first names and amounts only.
 *
 * {n} placeholders are positional, same order as the WhatsApp drafts.
 * Every variant ends with the STOP notice — US compliance wants it and
 * decency agrees.
 */

const TEMPLATES: Record<
  NotificationEvent,
  Record<"en" | "es" | "pt", string>
> = {
  owed_aging: {
    en: "{1}: {2} is still open for {3}'s job of {4}. Reply STOP to opt out.",
    es: "{1}: {2} sigue pendiente por el trabajo de {3} del {4}. Responde STOP para salir.",
    pt: "{1}: {2} ainda em aberto pelo serviço de {3} de {4}. Responda STOP para sair.",
  },
  payment_matched: {
    en: "{1}: {2} from {3} matched to their job. Books updated. Reply STOP to opt out.",
    es: "{1}: {2} de {3} se vinculó a su trabajo. Cuentas al día. Responde STOP para salir.",
    pt: "{1}: {2} de {3} vinculado ao serviço. Contas em dia. Responda STOP para sair.",
  },
  monthly_recap: {
    en: "{1} recap: {2} in, {3} out, {4} kept. Details in the app. Reply STOP to opt out.",
    es: "Resumen {1}: entró {2}, salió {3}, quedó {4}. Detalles en la app. Responde STOP para salir.",
    pt: "Resumo {1}: entrou {2}, saiu {3}, sobrou {4}. Detalhes no app. Responda STOP para sair.",
  },
};

export const renderSms = (
  event: NotificationEvent,
  lang: "en" | "es" | "pt",
  variables: string[],
): string => {
  let text = TEMPLATES[event][lang];
  variables.forEach((value, i) => {
    text = text.split(`{${i + 1}}`).join(value);
  });
  return text;
};
