"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmationSheet from "./confirmation-sheet";
import Dashboard from "./dashboard";
import DropZone from "./drop-zone";
import Insights from "./insights";
import OwedTab from "./owed-tab";
import { PublicFooter, PublicHeader } from "./public-shell";
import RunningTotals from "./running-totals";
import SwipeDeck from "./swipe-deck";
import { useLocale } from "./use-locale";
import { useSession } from "@/lib/supabase/use-session";
import { EMPTY_PROFILE } from "@/lib/profile";
import type { Sale } from "@/lib/sale";
import type { Transaction } from "@/lib/transaction";

/**
 * The public landing page — design-tokens.md is the law here: only
 * colors, type and component styles the app already uses, and every
 * illustration is a REAL component fed demo data — never a drawing of
 * one. The set mirrors the audited Ledger Mockups screen for screen:
 * the drop zone (hub), the confirmation sheet, "What we found" + the
 * swipe deck (sorting), the totals bar + Dashboard (your books), and
 * the Owed tab. Nothing here is chrome the app doesn't ship.
 *
 * Copy is trilingual through the same i18n as the app. One CTA
 * (founding-hundred email capture), repeated twice, per spec.
 */

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

/** Aged owed list — the mockups' three clients: one past the 14-day
 *  flag, one fresh, one recurring. Dates are relative to "today", so
 *  this only renders after mount (the server build's "today" would
 *  differ and trip hydration). */
const owedDemo = (): { sales: Sale[]; clients: { id: string; name: string; notes: string; distanceTenths: number | null }[] } => ({
  sales: [
    {
      id: "demo-sale-1",
      clientId: "demo-maria",
      lineItems: [
        { serviceId: null, name: "Limpeza — casa completa", quantity: 1, unitCents: 12000, unitCostCents: null },
      ],
      date: iso(34),
      state: "open",
      method: null,
      matchedTxnId: null,
      recurringTemplateId: null,
      notes: "",
      photo: null,
    },
    {
      id: "demo-sale-2",
      clientId: "demo-whitaker",
      lineItems: [
        { serviceId: null, name: "Lawn + edges", quantity: 1, unitCents: 14000, unitCostCents: null },
      ],
      date: iso(11),
      state: "open",
      method: null,
      matchedTxnId: null,
      recurringTemplateId: null,
      notes: "",
      photo: null,
    },
    {
      id: "demo-sale-3",
      clientId: "demo-ana",
      lineItems: [
        { serviceId: null, name: "Limpeza", quantity: 1, unitCents: 6000, unitCostCents: null },
      ],
      date: iso(3),
      state: "open",
      method: null,
      matchedTxnId: null,
      recurringTemplateId: "demo-template-ana",
      notes: "",
      photo: null,
    },
  ],
  clients: [
    { id: "demo-maria", name: "Maria Lopez", notes: "", distanceTenths: null },
    { id: "demo-whitaker", name: "J. Whitaker", notes: "", distanceTenths: null },
    { id: "demo-ana", name: "Ana Reyes", notes: "", distanceTenths: null },
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
      <PublicHeader />

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
            {/* The hub's real drop zone — the whole box is the tap target;
                there is no separate "choose" button in the app either. */}
            <DemoFrame label={t("landing.demoData")}>
              <DropZone busy={false} onFiles={noop} />
            </DemoFrame>
          </li>
          <li className="space-y-3">
            <p className="text-base font-semibold">
              <span className="mr-2 tabular-nums text-neutral-500">2</span>
              {t("landing.step2Title")}
            </p>
            <p className="text-sm text-neutral-500">{t("landing.step2Body")}</p>
            {/* The sorting stage exactly as it ships: "What we found" on
                top, then the deck — one card, Personal / Business below. */}
            <DemoFrame label={t("landing.demoData")}>
              <div className="space-y-4">
                <Insights transactions={SHEET_DEMO} />
                <SwipeDeck
                  pending={SHEET_DEMO}
                  onDecide={noop}
                  onUndo={noop}
                  canUndo={false}
                />
              </div>
            </DemoFrame>
          </li>
          <li className="space-y-3">
            <p className="text-base font-semibold">
              <span className="mr-2 tabular-nums text-neutral-500">3</span>
              {t("landing.step3Title")}
            </p>
            <p className="text-sm text-neutral-500">{t("landing.step3Body")}</p>
            {/* The totals bar and the Dashboard as the desktop rail shows
                them. Dashboard reads today's date for the quarter, so it
                waits for mount like the owed demo does. */}
            <DemoFrame label={t("landing.demoData")}>
              <div className="px-4">
                <RunningTotals transactions={TOTALS_DEMO} />
              </div>
              {mounted && (
                <Dashboard
                  transactions={TOTALS_DEMO}
                  services={[]}
                  sales={[]}
                  clients={[]}
                  templates={[]}
                  profile={EMPTY_PROFILE}
                />
              )}
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
        <Link href="/privacy" className="inline-block text-sm font-medium underline">
          {t("landing.trustLink")}
        </Link>
      </section>

      {/* CTA, second and last time */}
      <div className="mt-14">
        <Cta />
      </div>

      <PublicFooter />
    </main>
  );
}
