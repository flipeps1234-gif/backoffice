"use client";

import Link from "next/link";
import LocalePicker from "./locale-picker";
import Mark from "./mark";
import { useLocale } from "./use-locale";

/**
 * The frame every public page shares (landing, help, privacy, terms):
 * the app's own header row and a plain footer. One place, so the
 * public surface can't drift apart page by page.
 */

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

export function PublicHeader() {
  const { t } = useLocale();
  return (
    <header className="mb-10 flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <Mark />
        contado
      </Link>
      <div className="flex items-center gap-3">
        <LocalePicker compact />
        <Link
          href="/app"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-900"
        >
          {t("landing.openApp")}
        </Link>
      </div>
    </header>
  );
}

/** The gated support link, shared by the footer and the help page. */
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

export function PublicFooter() {
  const { t } = useLocale();
  return (
    <footer className="mt-14 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800">
      <Link href="/help" className="hover:underline">
        {t("landing.footerHelp")}
      </Link>
      <Link href="/privacy" className="hover:underline">
        {t("landing.footerPrivacy")}
      </Link>
      <Link href="/terms" className="hover:underline">
        {t("landing.footerTerms")}
      </Link>
      <TextUs />
    </footer>
  );
}
