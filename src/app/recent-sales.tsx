"use client";

import type { Client } from "@/lib/client";
import { saleTotalCents, type Sale } from "@/lib/sale";
import { formatCents } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/**
 * "Log again" from the homepage: the last sales, grouped by client, one
 * tap each. Picking one jumps straight to PAID? pre-filled — the 2–3 tap
 * repeat the ten-second law demands. The client-first ordering lives on
 * the Clients page; which one the button opens by default is PARKED for
 * a future settings tab (IDEAS.md).
 */
export default function RecentSales({
  sales,
  clients,
  onPick,
  onClose,
}: {
  sales: Sale[];
  clients: Client[];
  onPick: (sale: Sale) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const nameOf = (id: string | null) =>
    clients.find((c) => c.id === id)?.name ?? t("owed.noClient");

  // Newest first, one entry per (client, item set) — the same job twice
  // last month is ONE button, not two.
  const seen = new Set<string>();
  const recent: Sale[] = [];
  for (const sale of sales) {
    const key = `${sale.clientId ?? ""}|${sale.lineItems
      .map((i) => `${i.serviceId ?? i.name}×${i.quantity}`)
      .sort()
      .join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push(sale);
    if (recent.length >= 10) break;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("common.logAgain")}</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("owed.noRepeats")}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {recent.map((sale) => (
            <li key={sale.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                onClick={() => onPick(sale)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {nameOf(sale.clientId)}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {sale.lineItems.map((i) => i.name).join(", ") ||
                      t("owed.sale")}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCents(saleTotalCents(sale))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
