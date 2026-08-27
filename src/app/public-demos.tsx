"use client";

import { useSyncExternalStore } from "react";
import type { Sale } from "@/lib/sale";
import type { Transaction } from "@/lib/transaction";

/**
 * Demo data and the frame the public pages show REAL components in.
 * One module, so the landing, how-it-works and the trade pages draw the
 * same Maria, the same $120.00, the same limpeza — and so no page can
 * quietly invent chrome: these fixtures feed the shipped components,
 * nothing else is drawn.
 */

export const demoTxn = (patch: Partial<Transaction>): Transaction => ({
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

/** The sheet / deck batch: Maria's limpeza with one flagged field (the
 *  amber "check this" ring is the honest version of the pitch) and a
 *  Home Depot receipt. */
export const SHEET_DEMO: Transaction[] = [
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

/** The books after the batch was swiped: two business rows, one personal. */
export const TOTALS_DEMO: Transaction[] = [
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

export type DemoClient = { id: string; name: string; notes: string; distanceTenths: number | null };

/** The owed list — the mockups' three clients: one past the 14-day flag,
 *  one fresh, one recurring. Dates are relative to "today", so callers
 *  render this only after mount (useMounted) — the server's "today"
 *  would differ and trip hydration. */
export const owedDemo = (): { sales: Sale[]; clients: DemoClient[] } => ({
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

export const noop = () => {};

/** True after hydration, false in the server render — the same
 *  useSyncExternalStore trick use-locale relies on, and it keeps the
 *  date-dependent demos out of the HTML the server produced. */
const emptySubscribe = () => () => {};
export const useMounted = (): boolean =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

/** A real component shown as an illustration: inert and out of the
 *  accessibility tree, framed in the app's own card style.
 *
 *  inert + pointer-events-none SHOULD make the demo untouchable, but a
 *  visitor on an iPhone got the keyboard open inside one and typed real
 *  client data into what they believed was the app. So the frame no
 *  longer trusts the browser: a transparent cover sits ABOVE the demo
 *  and swallows every tap before it can reach an input (isolate caps
 *  the demo's own z-indexes under it), and a focus-capture backstop
 *  blurs anything that somehow gets focus anyway. */
export function DemoFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="mx-auto w-full max-w-sm">
      <div
        className="relative"
        onFocusCapture={(event) => {
          const target = event.target as HTMLElement;
          if (typeof target.blur === "function") target.blur();
        }}
      >
        <div
          aria-hidden="true"
          inert
          className="isolate pointer-events-none select-none overflow-hidden rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {children}
        </div>
        <div aria-hidden="true" className="absolute inset-0 z-10" />
      </div>
      <figcaption className="mt-2 text-center text-xs text-neutral-500">
        {label}
      </figcaption>
    </figure>
  );
}
