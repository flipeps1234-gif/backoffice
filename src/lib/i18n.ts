import { messages as cats } from "./messages/cats";
import { messages as clients } from "./messages/clients";
import { messages as common } from "./messages/common";
import { messages as dash } from "./messages/dash";
import { messages as home } from "./messages/home";
import { messages as insights } from "./messages/insights";
import { messages as owed } from "./messages/owed";
import { messages as products } from "./messages/products";
import { messages as quickadd } from "./messages/quickadd";
import { messages as sale } from "./messages/sale";
import { messages as search } from "./messages/search";
import { messages as sheet } from "./messages/sheet";
import { messages as shell } from "./messages/shell";
import { messages as signin } from "./messages/signin";
import { messages as terms } from "./messages/terms";

/**
 * Hand-rolled i18n — a dictionary and a lookup, nothing else. No library
 * (boring wins; every i18n dep drags in plural engines and loaders this
 * app doesn't need), no build step, no async: three languages ship in the
 * bundle because ALL of them together are smaller than one screenshot.
 *
 * Keys are typed: a component asking for a key no fragment defines fails
 * `tsc`, which is what makes twelve separately-authored fragments safe to
 * merge blind.
 *
 * What is deliberately NOT localized:
 * - Money. formatCents stays $ en-US — the audience runs US businesses;
 *   mixing $ 1.234,56 into a ledger some rows of which came from en-US
 *   screenshots invites transcription errors.
 * - CSV exports. They go to a tax preparer, who works in English forms.
 * - console.error strings — developer-facing.
 * - API route error bodies (extract/demo-session). The server doesn't
 *   know the device's language; the client keys its own fallbacks and
 *   passes server detail through in English. Fixing this properly means
 *   error CODES in the API contract — noted for a later pass, not
 *   worth destabilizing the contract mid-v0.6.
 * - Data written to the ledger (line-item names, the "Custom"/"Payment"
 *   fallbacks). Stored values must not depend on the screen language at
 *   the moment of logging; display-side fallbacks ARE translated.
 */

export type Locale = "en" | "es" | "pt";

export const LOCALES: readonly Locale[] = ["en", "es", "pt"];

export type Message = { en: string; es: string; pt: string };

const ALL = {
  ...common,
  ...terms,
  ...signin,
  ...shell,
  ...home,
  ...sheet,
  ...insights,
  ...quickadd,
  ...dash,
  ...products,
  ...sale,
  ...search,
  ...owed,
  ...clients,
  ...cats,
} as const;

export type MessageKey = keyof typeof ALL;

export const MESSAGES: Record<MessageKey, Message> = ALL;

/** BCP-47 tag for date formatting — the one place locale touches Intl. */
export const localeTag = (locale: Locale): string =>
  locale === "es" ? "es" : locale === "pt" ? "pt-BR" : "en-US";

/**
 * {name}-style interpolation. Params are plain string/number — anything
 * needing real plural rules gets two keys and a ternary in the component,
 * because three languages × a handful of counts does not justify an engine.
 */
export const translate = (
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string => {
  const entry = MESSAGES[key];
  // The types make a miss impossible from checked code; the fallback is
  // for jsonb-era paranoia only — show the key, never crash a render.
  let text: string = entry ? entry[locale] : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
};
