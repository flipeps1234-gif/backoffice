"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "./analytics";
import LocalePicker from "./locale-picker";
import Mark from "./mark";
import { useLocale } from "./use-locale";
import type { MessageKey } from "@/lib/i18n";
import { localeTag } from "@/lib/i18n";

/**
 * The frame every public page shares (landing, how it works, pricing,
 * trade pages, help, about, contact, FAQ, legal): the app's own header
 * row, a site nav under it, and a footer that lists every public page
 * once. One place, so the public surface can't drift apart page by page
 * — and so a crawler finds every page from any page.
 *
 * Tokens only (design-tokens.md): neutral text, the foreground for the
 * current page, no new component styles.
 */

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const YEAR = new Date().getFullYear();

const NAV: readonly { href: string; key: MessageKey }[] = [
  { href: "/how-it-works", key: "site.navHow" },
  { href: "/pricing", key: "site.navPricing" },
  { href: "/help", key: "site.navHelp" },
  { href: "/about", key: "site.navAbout" },
];

const PRODUCT_LINKS: readonly { href: string; key: MessageKey }[] = [
  { href: "/how-it-works", key: "site.navHow" },
  { href: "/pricing", key: "site.navPricing" },
  { href: "/for/cleaners", key: "site.forCleaners" },
  { href: "/for/landscapers", key: "site.forLandscapers" },
  { href: "/for/barbers", key: "site.forBarbers" },
];

const TRACK_LINKS: readonly { href: string; key: MessageKey }[] = [
  { href: "/track/venmo", key: "site.trackVenmo" },
  { href: "/track/cash-app", key: "site.trackCashApp" },
  { href: "/track/zelle", key: "site.trackZelle" },
  { href: "/track/cash", key: "site.trackCash" },
];

const COMPANY_LINKS: readonly { href: string; key: MessageKey }[] = [
  { href: "/about", key: "site.navAbout" },
  { href: "/contact", key: "site.navContact" },
  { href: "/faq", key: "site.navFaq" },
  { href: "/help", key: "site.navHelp" },
];

const LEGAL_LINKS: readonly { href: string; key: MessageKey }[] = [
  { href: "/privacy", key: "landing.footerPrivacy" },
  { href: "/terms", key: "landing.footerTerms" },
];

/** Keep <html lang> honest after hydration: the server says "en" because
 *  it can't know the device language; once the client knows, the
 *  document says so too (screen readers and translation tools read it). */
function useLangSync() {
  const { locale } = useLocale();
  useEffect(() => {
    document.documentElement.lang = localeTag(locale);
  }, [locale]);
}

function NavLinks() {
  const { t } = useLocale();
  const pathname = usePathname();
  return (
    <>
      {NAV.map((item) => {
        const current =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={
              current ? "font-medium" : "text-neutral-500 hover:underline"
            }
          >
            {t(item.key)}
          </Link>
        );
      })}
    </>
  );
}

export function PublicHeader() {
  const { t } = useLocale();
  useLangSync();
  return (
    <header className="mb-10 space-y-4 lg:space-y-0">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Mark />
            contado
          </Link>
          {/* Desktop: the nav sits in the header row. Only one of the two
              nav landmarks is ever displayed (the other is display:none). */}
          <nav
            aria-label={t("site.siteNav")}
            className="hidden gap-x-5 text-sm lg:flex"
          >
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LocalePicker compact />
          {/* A full-document navigation on purpose (not <Link>): the
              public site's analytics tag must not ride a client-side
              transition into the app. 44px tall — the tokens' secondary
              button, not a shrunken one. */}
          <a
            href="/app"
            // beacon transport: this is a full-document navigation, so a
            // plain event could be lost as the page unloads.
            onClick={() => trackEvent("open_app_click", { transport_type: "beacon" })}
            className="inline-flex h-11 items-center rounded-lg border border-neutral-300 px-4 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-900"
          >
            {t("landing.openApp")}
          </a>
        </div>
      </div>
      <nav
        aria-label={t("site.siteNav")}
        className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:hidden"
      >
        <NavLinks />
      </nav>
    </header>
  );
}

/** The gated support link, shared by the footer, the help page and the
 *  contact page. No number configured → the honest "coming soon". */
export function TextUs() {
  const { t } = useLocale();
  if (SUPPORT_WHATSAPP) {
    return (
      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}`}
        target="_blank"
        rel="noreferrer"
        className="hover:underline"
      >
        {t("landing.textUs")}
      </a>
    );
  }
  return <span>{t("landing.textUsSoon")}</span>;
}

/** The gated email link — same posture as TextUs. */
export function EmailUs() {
  const { t } = useLocale();
  if (!SUPPORT_EMAIL) return null;
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline">
      {t("site.emailUs")}
    </a>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: MessageKey;
  links: readonly { href: string; key: MessageKey }[];
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        {t(title)}
      </p>
      <ul className="space-y-1.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:underline">
              {t(link.key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicFooter() {
  const { t } = useLocale();
  return (
    <footer className="mt-14 space-y-6 border-t border-neutral-200 pt-8 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <FooterColumn title="site.footerProduct" links={PRODUCT_LINKS} />
        <FooterColumn title="site.footerTrack" links={TRACK_LINKS} />
        <FooterColumn title="site.footerCompany" links={COMPANY_LINKS} />
        <FooterColumn title="site.footerLegal" links={LEGAL_LINKS} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
        <span>{t("landing.trustTitle")}</span>
        <TextUs />
        <EmailUs />
        {/* The year is baked into the static HTML at build; after New
            Year the client's year differs until the next deploy. Let the
            client win silently instead of warning on every visit. */}
        <span className="tabular-nums" suppressHydrationWarning>
          {t("site.copyright", { year: YEAR })}
        </span>
      </div>
    </footer>
  );
}
