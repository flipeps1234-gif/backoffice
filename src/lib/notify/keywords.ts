/**
 * Inbound keywords on the alerts numbers — the opt-out and help vocabulary,
 * in the three languages the app speaks. ONE module for both webhooks
 * (sms, whatsapp): a STOP that works on one channel and not the other is
 * not an opt-out.
 *
 * Matching is generous on purpose. The text is folded (case and accents
 * off) and split into words, and ANY opt-out word anywhere counts — "Stop
 * sending these", "PARE por favor", "opt-out". Since April 2025 the FCC's
 * TCPA rules count a reply using stop, quit, end, revoke, opt out, cancel
 * or unsubscribe as revoking consent. A false positive costs the owner one
 * tick in Settings; a false negative texts someone who asked us to stop.
 * When a message carries both, opt-out beats help.
 */

export type KeywordLang = "en" | "es" | "pt";

export type InboundKeyword = {
  kind: "stop" | "help";
  lang: KeywordLang;
  /** A word that is Spanish AND Portuguese (SHARED_ES_PT): `lang` is only
   *  the default; inbound.ts replyLanguage settles it. */
  shared?: true;
};

// Maps, not object literals: "constructor" must not read as a keyword.
// The language is the word's own; the reply's is replyLanguage's call
// (inbound.ts), which starts from it.
const STOP_WORDS = new Map<string, KeywordLang>([
  ["stop", "en"],
  ["stopall", "en"],
  ["unsubscribe", "en"],
  ["cancel", "en"],
  ["end", "en"],
  ["quit", "en"],
  ["revoke", "en"],
  ["optout", "en"],
  ["parar", "es"],
  ["alto", "es"],
  ["baja", "es"],
  ["cancelar", "es"],
  ["salir", "es"],
  ["detener", "es"],
  ["pare", "pt"],
  ["sair", "pt"],
  ["descadastrar", "pt"],
]);

// Spanish AND Portuguese. The map's language above is their default.
const SHARED_ES_PT = new Set(["parar", "cancelar", "pare"]);

const HELP_WORDS = new Map<string, KeywordLang>([
  ["help", "en"],
  ["ayuda", "es"],
  ["ajuda", "pt"],
]);

/** Lowercase, accents off, words only: "¡PÁRE ya!" → ["pare", "ya"]. */
const words = (text: string): string[] =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const inboundKeyword = (text: string): InboundKeyword | null => {
  const tokens = words(text);
  for (const [i, token] of tokens.entries()) {
    // "opt out" and "opt-out" arrive as two words; "optout" is one.
    const lang =
      STOP_WORDS.get(token) ??
      (token === "opt" && tokens[i + 1] === "out" ? "en" : undefined);
    if (lang) {
      return SHARED_ES_PT.has(token)
        ? { kind: "stop", lang, shared: true }
        : { kind: "stop", lang };
    }
  }
  for (const token of tokens) {
    const lang = HELP_WORDS.get(token);
    if (lang) return { kind: "help", lang };
  }
  return null;
};

export const isStopMessage = (text: string): boolean =>
  inboundKeyword(text)?.kind === "stop";

/**
 * Twilio answers these itself when one is the WHOLE message (its default
 * keyword handling, on unless the owner turns it off): STOP and friends get
 * Twilio's opt-out confirmation and a block on Twilio's side, HELP and INFO
 * get its help text (set to the help reply below in the Twilio console's
 * Advanced Opt-Out — an owner step before SMS goes live).
 * The SMS webhook stays quiet on exactly these, or the person gets two
 * replies; everything else — the Spanish and Portuguese words, "opt out",
 * "stop texting me" — only this app can answer.
 */
const TWILIO_KEYWORDS = new Set([
  "stop",
  "stopall",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
  "help",
  "info",
]);

export const twilioAnswers = (text: string): boolean => {
  const tokens = words(text);
  return tokens.length === 1 && TWILIO_KEYWORDS.has(tokens[0]);
};

/**
 * The replies. Short and plain for the same reason as sms-templates.ts
 * (segment math in sms.ts): the English stays in GSM-7, one segment; the
 * accented Spanish and Portuguese stay within two. Every reply names the
 * brand, and the opt-out reply says how to come back — Settings is the
 * only way back in (a fresh tick, dated after the STOP).
 */
const REPLIES: Record<InboundKeyword["kind"], Record<KeywordLang, string>> = {
  help: {
    en: "contado alerts: help at mail@getcontado.com. Reply STOP to cancel.",
    es: "Alertas de contado: ayuda en mail@getcontado.com. Responde STOP para salir.",
    pt: "Alertas do contado: ajuda em mail@getcontado.com. Responda STOP para sair.",
  },
  stop: {
    en: "contado: you're unsubscribed. No more alerts will be sent to this number. Turn them back on any time in Settings.",
    es: "contado: listo, no recibirás más alertas en este número. Puedes reactivarlas cuando quieras en Ajustes.",
    pt: "contado: pronto, você não vai receber mais alertas neste número. Reative quando quiser em Configurações.",
  },
};

export const keywordReply = (keyword: InboundKeyword): string =>
  REPLIES[keyword.kind][keyword.lang];
