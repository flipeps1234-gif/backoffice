"use client";

import { groupByDay } from "@/lib/history";
import { formatCents, type Transaction } from "@/lib/transaction";
import type { Service } from "@/lib/service";

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
  const groups = groupByDay(transactions, localToday());
  const serviceName = (id: string | null) =>
    id ? services.find((s) => s.id === id)?.name : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">History</h2>
        {onClose && (
          <button
            type="button"
            className="text-sm text-neutral-500 hover:underline"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-neutral-500">
          Nothing sorted yet. Payments land here once you&apos;ve swiped them.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.date || "undated"}>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {group.label}
          </h3>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {group.transactions.map((tx) => {
              const out = tx.direction === "out";
              const detail = [
                serviceName(tx.serviceId),
                out ? "expense" : undefined,
                tx.source === "manual" ? "Cash" : "Screenshot",
                tx.business ? undefined : "personal",
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
                      {tx.payer || "No name"}
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
                      Log again
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
