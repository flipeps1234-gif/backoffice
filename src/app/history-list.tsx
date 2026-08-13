"use client";

import { groupByDay } from "@/lib/history";
import { formatCents, type Transaction } from "@/lib/transaction";
import type { Service } from "@/lib/service";
import { useLocale } from "./use-locale";

/**
 * The record: every triaged payment, newest day first. "Log again" reopens
 * the numpad pre-filled — the regulars (same job, same price, every other
 * week) become a two-tap log.
 */

export type LogAgainPrefill = {
  payer: string;
  amountCents: number;
  serviceId: string | null;
  quantity: number | null;
  business: boolean;
  direction: "in" | "out";
};

const localToday = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export default function HistoryList({
  transactions,
  services,
  onLogAgain,
  onClose,
}: {
  transactions: Transaction[];
  services: Service[];
  onLogAgain: (prefill: LogAgainPrefill) => void;
  /** Omitted when embedded in the desktop rail — no takeover, no Close. */
  onClose?: () => void;
}) {
  const { t, tag } = useLocale();
  const today = localToday();
  const groups = groupByDay(transactions, today);
  const serviceName = (id: string | null) =>
    id ? services.find((s) => s.id === id)?.name : undefined;

  const dayLabel = (date: string): string => {
    if (date === "") return t("insights.noDate");
    if (date === today) return t("insights.today");
    const parsed = new Date(`${date}T00:00:00Z`);
    const daysAgo = Math.round(
      (new Date(`${today}T00:00:00Z`).getTime() - parsed.getTime()) / 86_400_000,
    );
    if (daysAgo === 1) return t("insights.yesterday");
    return parsed.toLocaleDateString(tag, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("insights.history")}</h2>
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

      {groups.length === 0 && (
        <p className="text-sm text-neutral-500">{t("insights.emptyHistory")}</p>
      )}

      {groups.map((group) => (
        <section key={group.date || "undated"}>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {dayLabel(group.date)}
          </h3>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {group.transactions.map((tx) => {
              const out = tx.direction === "out";
              const detail = [
                serviceName(tx.serviceId),
                out ? t("insights.expense") : undefined,
                tx.source === "manual" ? t("insights.cash") : t("insights.screenshot"),
                tx.business ? undefined : t("insights.personalTag"),
                tx.memo || undefined,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-900">
                      {tx.payer || t("insights.noName")}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        out
                          ? tx.business
                            ? "text-red-600"
                            : "text-red-300"
                          : tx.business
                            ? "text-neutral-900"
                            : "text-neutral-400"
                      }`}
                    >
                      {out ? "−" : ""}
                      {formatCents(tx.amountCents)}
                    </span>
                    <button
                      type="button"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
                      onClick={() =>
                        onLogAgain({
                          payer: tx.payer,
                          amountCents: tx.amountCents,
                          serviceId: tx.serviceId,
                          quantity: tx.quantity,
                          business: tx.business === true,
                          direction: tx.direction,
                        })
                      }
                    >
                      {t("common.logAgain")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
