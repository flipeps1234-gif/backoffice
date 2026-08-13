"use client";

import { useState } from "react";
import type { Client } from "@/lib/client";
import {
  EXPECTED_FLAG_DAYS,
  OWED_FLAG_DAYS,
  owedCents,
  saleAgeDays,
  saleTotalCents,
  type Sale,
} from "@/lib/sale";
import { formatCents } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/**
 * The Owed tab — FLOW.md's left box. Everything OPEN, grouped by client,
 * aged, with the total big. An OPEN sale clears by cash mark (here) or by
 * the matching engine (elsewhere). Past OWED_FLAG_DAYS it gets a gentle
 * age flag — a nudge, not a siren; chasing clients is the owner's craft.
 *
 * EXPECTED sales that outstayed EXPECTED_FLAG_DAYS also surface here with
 * the resolve sheet: keep waiting / actually unpaid / it was cash.
 */

const todayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export default function OwedTab({
  sales,
  clients,
  onMarkCash,
  onMoveToOwed,
  onFindPayment,
  onLogAgain,
  onClose,
}: {
  sales: Sale[];
  clients: Client[];
  /** Cash arrived for this sale — OPEN or EXPECTED alike. */
  onMarkCash: (saleId: string) => void;
  /** EXPECTED resolve: "actually unpaid". */
  onMoveToOwed: (saleId: string) => void;
  /** EXPECTED resolve: hand-link against payments already on the ledger,
   *  with the name rule relaxed — the auto-matcher could not find it, and
   *  the human is looking right at the list. */
  onFindPayment: (saleId: string) => void;
  onLogAgain: (sale: Sale) => void;
  onClose?: () => void;
}) {
  const { t } = useLocale();
  const [resolving, setResolving] = useState<string | null>(null);
  const today = todayIso();
  const nameOf = (id: string | null) =>
    clients.find((c) => c.id === id)?.name ?? t("owed.noClient");

  const open = sales.filter((s) => s.state === "open");
  const staleExpected = sales.filter(
    (s) =>
      s.state === "expected" && saleAgeDays(s, today) >= EXPECTED_FLAG_DAYS,
  );

  // Group by client, biggest debtor first — that's who to call.
  const groups = new Map<string, Sale[]>();
  for (const sale of open) {
    const key = sale.clientId ?? "";
    groups.set(key, [...(groups.get(key) ?? []), sale]);
  }
  const sorted = [...groups.entries()].sort(
    (a, b) =>
      owedCents(b[1]) - owedCents(a[1]) ||
      nameOf(a[0] || null).localeCompare(nameOf(b[0] || null)),
  );

  const totalOwed = owedCents(open);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("owed.title")}</h2>
        {onClose && (
          <button
            type="button"
            className="text-sm text-neutral-500 hover:underline"
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        )}
      </div>

      <p className="text-center text-4xl font-semibold tabular-nums">
        {formatCents(totalOwed)}
      </p>

      {open.length === 0 && staleExpected.length === 0 && (
        <p className="text-sm text-neutral-500">{t("owed.empty")}</p>
      )}

      {sorted.map(([clientKey, clientSales]) => (
        <section key={clientKey || "none"}>
          <h3 className="mb-2 text-sm font-medium">
            {nameOf(clientKey || null)}
            <span className="ml-2 text-neutral-500">
              {formatCents(owedCents(clientSales))} ·{" "}
              {t(
                clientSales.length === 1
                  ? "owed.saleCount.one"
                  : "owed.saleCount.many",
                { count: clientSales.length },
              )}
            </span>
          </h3>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {clientSales.map((sale) => {
              const age = saleAgeDays(sale, today);
              return (
                <li key={sale.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {sale.lineItems.map((i) => i.name).join(", ") ||
                        t("owed.sale")}
                      {sale.recurringTemplateId && (
                        <span className="ml-1 text-xs text-neutral-500">
                          · {t("owed.recurring")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {sale.date}
                      {age >= OWED_FLAG_DAYS && (
                        <span className="ml-1 text-amber-700 dark:text-amber-400">
                          · {t("owed.daysOld", { days: age })}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCents(saleTotalCents(sale))}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                    onClick={() => onMarkCash(sale.id)}
                  >
                    {t("common.gotCash")}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                    onClick={() => onLogAgain(sale)}
                  >
                    {t("common.logAgain")}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {staleExpected.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            {t("owed.staleTitle")}
          </h3>
          <p className="mb-2 text-xs text-neutral-500">
            {t("owed.staleBody", { days: EXPECTED_FLAG_DAYS })}
          </p>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-amber-300 bg-white dark:divide-neutral-800 dark:border-amber-700 dark:bg-neutral-900">
            {staleExpected.map((sale) => (
              <li key={sale.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm">
                    {nameOf(sale.clientId)} ·{" "}
                    {sale.lineItems.map((i) => i.name).join(", ") ||
                      t("owed.sale")}{" "}
                    · {sale.date}
                  </p>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCents(saleTotalCents(sale))}
                  </span>
                </div>
                {resolving === sale.id ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                      onClick={() => setResolving(null)}
                    >
                      {t("owed.keepWaiting")}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                      onClick={() => {
                        onMoveToOwed(sale.id);
                        setResolving(null);
                      }}
                    >
                      {t("owed.actuallyUnpaid")}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                      onClick={() => {
                        onMarkCash(sale.id);
                        setResolving(null);
                      }}
                    >
                      {t("owed.wasCash")}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                      onClick={() => {
                        onFindPayment(sale.id);
                        setResolving(null);
                      }}
                    >
                      {t("owed.findPayment")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-1 text-xs text-neutral-500 hover:underline"
                    onClick={() => setResolving(sale.id)}
                  >
                    {t("owed.resolve")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
