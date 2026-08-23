import type { messages } from "./messages/site";

type SiteKey = keyof typeof messages;

/**
 * The FAQ page's question/answer pairs, in display order. A plain module
 * (no "use client") so BOTH sides import the same list: the server page
 * builds FAQPage structured data from it, the client component renders
 * it — they cannot drift, and the server never has to reach into a
 * client module for data (which is what a client reference forbids).
 */
export const FAQ_KEYS: readonly { q: SiteKey; a: SiteKey }[] = [
  { q: "site.faq1Q", a: "site.faq1A" },
  { q: "site.faq2Q", a: "site.faq2A" },
  { q: "site.faq3Q", a: "site.faq3A" },
  { q: "site.faq4Q", a: "site.faq4A" },
  { q: "site.faqLangQ", a: "site.faqLangA" },
  { q: "site.faq5Q", a: "site.faq5A" },
  { q: "site.faq6Q", a: "site.faq6A" },
  { q: "site.faq7Q", a: "site.faq7A" },
  { q: "site.faq8Q", a: "site.faq8A" },
  { q: "site.faq9Q", a: "site.faq9A" },
  { q: "site.faq10Q", a: "site.faq10A" },
];
