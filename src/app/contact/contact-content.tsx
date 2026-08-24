"use client";

import Link from "next/link";
import Cta from "../founding-cta";
import { PublicFooter, PublicHeader } from "../public-shell";
import { useLocale } from "../use-locale";

/**
 * Contact: the channels that actually exist. Both the WhatsApp number and
 * the email are env-gated — unset means not shown, never a dead link —
 * and the help center is always the first suggestion because it answers
 * fastest.
 */
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const option =
  "block rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-900";

export default function ContactContent() {
  const { t } = useLocale();
  const hasChannel = Boolean(SUPPORT_WHATSAPP || SUPPORT_EMAIL);
  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8 lg:max-w-5xl">
      <PublicHeader />

      <h1 className="text-4xl font-semibold tracking-tight">{t("site.contactTitle")}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-500">{t("site.contactIntro")}</p>

      <div className="mt-8 space-y-3 lg:max-w-[40rem]">
        <Link href="/help" className={option}>
          {t("site.contactHelp")}
        </Link>
        {SUPPORT_WHATSAPP && (
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className={option}
          >
            {t("site.contactText")}
          </a>
        )}
        {SUPPORT_EMAIL && (
          <a href={`mailto:${SUPPORT_EMAIL}`} className={option}>
            {t("site.emailUs")} — {SUPPORT_EMAIL}
          </a>
        )}
        {!hasChannel && (
          <p className="text-sm text-neutral-500">{t("site.contactNoChannel")}</p>
        )}
      </div>

      <section className="mt-12 space-y-2">
        <h2 className="text-base font-semibold">{t("site.commonQuestions")}</h2>
        <p className="text-sm text-neutral-500">
          <Link href="/faq" className="underline">
            {t("site.navFaq")}
          </Link>
          {" · "}
          <Link href="/help" className="underline">
            {t("site.navHelp")}
          </Link>
        </p>
      </section>

      <div className="mt-12 lg:max-w-[40rem]">
        <Cta />
      </div>

      <PublicFooter />
    </main>
  );
}
