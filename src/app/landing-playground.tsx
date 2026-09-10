"use client";

import { useState } from "react";
import type { Sale } from "@/lib/sale";
import type { Transaction } from "@/lib/transaction";
import ConfirmationSheet from "./confirmation-sheet";
import Insights from "./insights";
import OwedTab from "./owed-tab";
import { SHEET_DEMO, TryFrame, owedDemo, useMounted } from "./public-demos";
import SwipeDeck from "./swipe-deck";
import { useLocale } from "./use-locale";

/**
 * The landing page's hands-on demos: the REAL components (the sheet, the
 * swipe deck, the Owed tab) fed the same fixtures as before, but wired to
 * page-local state so a visitor can type, swipe and tap. Nothing here
 * touches storage or the network — every playground starts from its
 * fixture on each load and offers a reset once something changed.
 */

const fresh = (): Transaction[] => SHEET_DEMO.map((tx) => ({ ...tx }));

/** The confirmation sheet with every field editable and rows removable. */
export function SheetPlayground() {
  const { t } = useLocale();
  const [rows, setRows] = useState<Transaction[]>(fresh);
  const [touched, setTouched] = useState(false);
  return (
    <TryFrame
      label={t("landing.tryIt")}
      resetLabel={t("landing.resetDemo")}
      onReset={touched ? () => { setRows(fresh()); setTouched(false); } : undefined}
    >
      <ConfirmationSheet
        transactions={rows}
        onChange={(id, patch) => {
          setTouched(true);
          setRows((current) => current.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)));
        }}
        removableIds={rows.map((tx) => tx.id)}
        onRemove={(id) => {
          setTouched(true);
          setRows((current) => current.filter((tx) => tx.id !== id));
        }}
      />
    </TryFrame>
  );
}

/** "What we found" plus the deck: swipe, then undo, until the pile is empty.
 *  The welcome tour mounts this inside the signed-in app and passes its
 *  own caption and reset wording (the landing's "demo" is the wrong word
 *  there); the landing keeps the defaults. */
export function SwipePlayground({
  insightsBelow,
  label,
  resetLabel,
}: {
  insightsBelow: boolean;
  label?: string;
  resetLabel?: string;
}) {
  const { t } = useLocale();
  const [pending, setPending] = useState<Transaction[]>(fresh);
  const [decided, setDecided] = useState<{ tx: Transaction; business: boolean }[]>([]);
  const reset = () => { setPending(fresh()); setDecided([]); };
  return (
    <TryFrame
      label={label ?? t("landing.tryIt")}
      resetLabel={resetLabel ?? t("landing.resetDemo")}
      onReset={decided.length > 0 ? reset : undefined}
    >
      <div className="space-y-4">
        {insightsBelow && (
          <div className="lg:hidden">
            <Insights transactions={SHEET_DEMO} />
          </div>
        )}
        <SwipeDeck
          pending={pending}
          onDecide={(id, business) => {
            const tx = pending.find((row) => row.id === id);
            if (!tx) return;
            setDecided((stack) => [...stack, { tx: { ...tx, business }, business }]);
            setPending((current) => current.filter((row) => row.id !== id));
          }}
          onUndo={() => {
            const last = decided.at(-1);
            if (!last) return;
            setDecided((stack) => stack.slice(0, -1));
            setPending((current) => [{ ...last.tx, business: null }, ...current]);
          }}
          canUndo={decided.length > 0}
        />
      </div>
    </TryFrame>
  );
}

/** The Owed tab: "Got cash" settles a job, an expected one can go back to owed. */
export function OwedPlayground() {
  const { t } = useLocale();
  // owedDemo() reads today's date, so it waits for mount like the inert
  // demo did; edits are kept as patches so the fixture itself stays pure.
  const mounted = useMounted();
  const [patches, setPatches] = useState<Record<string, Partial<Sale>>>({});
  if (!mounted) return null;
  const demo = owedDemo();
  const sales = demo.sales.map((sale) => ({ ...sale, ...patches[sale.id] }));
  const patch = (id: string, change: Partial<Sale>) =>
    setPatches((current) => ({ ...current, [id]: { ...current[id], ...change } }));
  return (
    <TryFrame
      label={t("landing.tryIt")}
      resetLabel={t("landing.resetDemo")}
      onReset={Object.keys(patches).length > 0 ? () => setPatches({}) : undefined}
    >
      <OwedTab
        sales={sales}
        clients={demo.clients}
        onMarkCash={(saleId) => patch(saleId, { state: "paid", method: "cash" })}
        onMoveToOwed={(saleId) => patch(saleId, { state: "open", method: null })}
        onFindPayment={() => {}}
        onLogAgain={() => {}}
      />
    </TryFrame>
  );
}
