/**
 * The company website beyond the landing page: navigation, footer and
 * the pages under it (how it works, pricing, trade pages, about,
 * contact, FAQ). Same register as the app — short declarative
 * sentences, ES is LatAm tú, PT is Brazilian você — and the same rule
 * for money: $ en-US, never localized (i18n.ts).
 *
 * SEO copy lives here too, so what a crawler reads in the English
 * prerender and what a Spanish-speaking owner reads after hydration
 * say the same thing.
 */
export const messages = {
  // ---- navigation + footer ----
  "site.navHow": { en: "How it works", es: "Cómo funciona", pt: "Como funciona" },
  "site.navPricing": { en: "Pricing", es: "Precios", pt: "Preços" },
  "site.navHelp": { en: "Help", es: "Ayuda", pt: "Ajuda" },
  "site.navAbout": { en: "About", es: "Acerca de", pt: "Sobre" },
  "site.navContact": { en: "Contact", es: "Contacto", pt: "Contato" },
  "site.navFaq": { en: "FAQ", es: "Preguntas frecuentes", pt: "Perguntas frequentes" },
  "site.forCleaners": { en: "For cleaners", es: "Para limpiadoras", pt: "Para faxineiras" },
  "site.forLandscapers": { en: "For landscapers", es: "Para jardineros", pt: "Para jardineiros" },
  "site.forBarbers": { en: "For barbers", es: "Para barberos", pt: "Para barbeiros" },
  "site.footerProduct": { en: "Product", es: "Producto", pt: "Produto" },
  "site.footerCompany": { en: "Company", es: "Empresa", pt: "Empresa" },
  "site.footerLegal": { en: "Legal", es: "Legal", pt: "Jurídico" },
  "site.emailUs": { en: "Email us", es: "Escríbenos un correo", pt: "Mande um e-mail" },
  "site.copyright": { en: "© {year} contado", es: "© {year} contado", pt: "© {year} contado" },
  "site.siteNav": { en: "Site", es: "Sitio", pt: "Site" },
} as const;
