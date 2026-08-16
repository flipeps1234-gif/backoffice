"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import ConfirmationSheet from "./confirmation-sheet";
import LocalePicker from "./locale-picker";
import Mark from "./mark";
import OwedTab from "./owed-tab";
import RunningTotals from "./running-totals";
import { useLocale } from "./use-locale";
import { useSession } from "@/lib/supabase/use-session";
import type { Sale } from "@/lib/sale";
import type { Transaction } from "@/lib/transaction";

/**
 * The public landing page — design-tokens.md is the law here: only
 * colors, type and component styles the app already uses, and the
 * demos are the REAL components (ConfirmationSheet, OwedTab,
 * RunningTotals) fed demo data, not screenshots or mockups.
 *
 * Copy is trilingual through the same i18n as the app. One CTA
 * (founding-hundred email capture), repeated twice, per spec.
 */

/** Support number, same build-time gate as the settings page. */
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

const demoTxn = (patch: Partial<Transaction>): Transaction => ({
  id: "demo",
  payer: "",
  amountCents: 0,
  date: "2026-08-14",
  memo: "",
  source: "screenshot",
  direction: "in",
  serviceId: null,
  quantity: null,
  business: null,
  matchedSaleId: null,
  category: null,
  confidence: {},
  ...patch,
});

/** The hero sheet: Maria's limpeza, one field flagged — showing the
 *  amber "check this" ring is the honest version of the pitch. */
const SHEET_DEMO: Transaction[] = [
  demoTxn({
    id: "demo-sheet-1",
    payer: "Maria Lopez",
    amountCents: 12000,
    memo: "Limpeza — casa completa",
    confidence: { amountCents: 0.55 },
  }),
  demoTxn({
    id: "demo-sheet-2",
    payer: "Home Depot",
    amountCents: 3420,
    date: "2026-08-13",
    memo: "Supplies",
    direction: "out",
  }),
];

/** Step 3: the totals after both demo rows were swiped. */
const TOTALS_DEMO: Transaction[] = [
  demoTxn({ id: "demo-tot-1", payer: "Maria Lopez", amountCents: 12000, business: true }),
  demoTxn({
    id: "demo-tot-2",
    payer: "Home Depot",
    amountCents: 3420,
    direction: "out",
    business: true,
  }),
  demoTxn({ id: "demo-tot-3", payer: "Mom", amountCents: 2500, business: false }),
];

const iso = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

/** Aged owed list: one fresh, one past the nudge threshold. Dates are
 *  relative to "today", so this only renders after mount (the server
 *  build's "today" would differ and trip hydration). */
const owedDemo = (): { sales: Sale[]; clients: { id: string; name: string; notes: string; distanceTenths: number | null }[] } => ({
  sales: [
    {
      id: "demo-sale-1",
      clientId: "demo-maria",
      lineItems: [
        { serviceId: null, name: "Limpeza — casa completa", quantity: 1, unitCents: 12000, unitCostCents: null },
      ],
      date: iso(5),
      state: "open",
      method: null,
      matchedTxnId: null,
      recurringTemplateId: null,
      notes: "",
      photo: null,
    },
    {
      id: "demo-sale-2",
      clientId: "demo-josh",
      lineItems: [
        { serviceId: null, name: "Lawn + edges", quantity: 1, unitCents: 8500, unitCostCents: null },
      ],
      date: iso(16),
      state: "open",
      method: null,
      matchedTxnId: null,
      recurringTemplateId: null,
      notes: "",
      photo: null,
    },
  ],
  clients: [
    { id: "demo-maria", name: "Maria Lopez", notes: "", distanceTenths: null },
    { id: "demo-josh", name: "Josh Carter", notes: "", distanceTenths: null },
  ],
});

const noop = () => {};

/** True after hydration, false in the server render — the same
 *  useSyncExternalStore trick use-locale relies on, and it keeps the
 *  date-dependent owed demo out of the HTML the server produced. */
const emptySubscribe = () => () => {};
const useMounted = (): boolean =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

/** A real component shown as an illustration: inert and out of the
 *  accessibility tree, framed in the app's own list style. */
function DemoFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="mx-auto w-full max-w-sm">
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none select-none overflow-hidden rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
      >
        {children}
      </div>
      <figcaption className="mt-2 text-center text-xs text-neutral-500">
        {label}
      </figcaption>
    </figure>
  );
}

function FoundingForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setState("invalid");
      return;
    }
    setState("busy");
    try {
      const response = await fetch("/api/founding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      setState(response.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        {t("landing.ctaDone")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          placeholder={t("landing.ctaPlaceholder")}
          aria-label={t("landing.ctaPlaceholder")}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state === "invalid" || state === "error") setState("idle");
          }}
          className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="h-11 shrink-0 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("landing.ctaButton")}
        </button>
      </div>
      {state === "invalid" && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("landing.ctaInvalid")}</p>
      )}
      {state === "error" && (
        <p className="text-sm text-red-700 dark:text-red-400">{t("landing.ctaError")}</p>
      )}
    </form>
  );
}

function Cta() {
  const { t } = useLocale();
  return (
    <section className="space-y-3 rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-base font-semibold">{t("landing.ctaTitle")}</h2>
      <p className="text-sm text-neutral-500">{t("landing.ctaBody")}</p>
      <FoundingForm />
    </section>
  );
}

export default function Landing() {
  const { t } = useLocale();
  const { user } = useSession();
  const router = useRouter();
  const mounted = useMounted();

  // Signed in already? This page is a poster on the door — go inside.
  useEffect(() => {
    if (user) router.replace("/app");
  }, [user, router]);

  const owed = mounted ? owedDemo() : null;

  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-8">
      <header className="mb-10 flex items-center justify-between">
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Mark />
          contado
        </p>
        <div className="flex items-center gap-3">
          <LocalePicker compact />
          <a
            href="/app"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-900"
          >
            {t("landing.openApp")}
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-sm text-neutral-500">{t("landing.heroSub")}</p>
        </div>
        <DemoFrame label={t("landing.demoData")}>
          <ConfirmationSheet transactions={SHEET_DEMO} onChange={noop} />
        </DemoFrame>
        <Cta />
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-14 space-y-6">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500">
          {t("landing.howTitle")}
        </h2>
        <ol className="space-y-8">
          <li className="space-y-3">
            <p className="text-base font-semibold">
              <span className="mr-2 tabular-nums text-neutral-500">1</span>
              {t("landing.step1Title")}
            </p>
            <p className="text-sm text-neutral-500">{t("landing.step1Body")}</p>
            <div
              aria-hidden="true"
              className="mx-auto w-full max-w-sm rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700"
            >
              Venmo · Cash App · Zelle
            </div>
          </li>
          <li className="space-y-3">
            <p className="text-base font-semibold">
              <span className="mr-2 tabular-nums text-neutral-500">2</span>
              {t("landing.step2Title")}
            </p>
            <p className="text-sm text-neutral-500">{t("landing.step2Body")}</p>
            <div
              aria-hidden="true"
              inert
              className="pointer-events-none mx-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span className="text-xs text-neutral-400">←</span>
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold">Maria Lopez</p>
                <p className="text-sm tabular-nums">$120.00</p>
                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  {t("sheet.moneyIn")}
                </span>
              </div>
              <span className="text-xs text-neutral-400">→</span>
            </div>
          </li>
          <li className="space-y-3">
            <p className="text-base font-semibold">
              <span className="mr-2 tabular-nums text-neutral-500">3</span>
              {t("landing.step3Title")}
            </p>
            <p className="text-sm text-neutral-500">{t("landing.step3Body")}</p>
            <DemoFrame label={t("landing.demoData")}>
              <div className="px-4">
                <RunningTotals transactions={TOTALS_DEMO} />
              </div>
            </DemoFrame>
          </li>
        </ol>
        <p className="text-sm text-neutral-500">{t("landing.law")}</p>
      </section>

      {/* OWED */}
      <section className="mt-14 space-y-4">
        <h2 className="text-base font-semibold">{t("landing.owedTitle")}</h2>
        <p className="text-sm text-neutral-500">{t("landing.owedBody")}</p>
        {owed && (
          <DemoFrame label={t("landing.demoData")}>
            <OwedTab
              sales={owed.sales}
              clients={owed.clients}
              onMarkCash={noop}
              onMoveToOwed={noop}
              onFindPayment={noop}
              onLogAgain={noop}
            />
          </DemoFrame>
        )}
      </section>

      {/* TAX */}
      <section className="mt-14 space-y-3">
        <h2 className="text-base font-semibold">{t("landing.taxTitle")}</h2>
        <p className="text-sm text-neutral-500">{t("landing.taxBody")}</p>
      </section>

      {/* TRUST */}
      <section className="mt-14 space-y-3">
        <h2 className="text-base font-semibold">{t("landing.trustTitle")}</h2>
        <ul className="space-y-2 text-sm text-neutral-500">
          <li>{t("landing.trust1")}</li>
          <li>{t("landing.trust2")}</li>
          <li>{t("landing.trust3")}</li>
          <li>{t("landing.trust4")}</li>
        </ul>
        <a href="/privacy" className="inline-block text-sm font-medium underline">
          {t("landing.trustLink")}
        </a>
      </section>

      {/* CTA, second and last time */}
      <div className="mt-14">
        <Cta />
      </div>

      <footer className="mt-14 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800">
        <a href="/help" className="hover:underline">
          {t("landing.footerHelp")}
        </a>
        <a href="/privacy" className="hover:underline">
          {t("landing.footerPrivacy")}
        </a>
        <a href="/terms" className="hover:underline">
          {t("landing.footerTerms")}
        </a>
        {SUPPORT_WHATSAPP ? (
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {t("landing.textUs")}
          </a>
        ) : (
          <span>{t("landing.textUsSoon")}</span>
        )}
      </footer>
    </main>
  );
}
