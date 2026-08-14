"use client";

import { useState } from "react";
import type { Client } from "@/lib/client";
import { owedCents, saleTotalCents, type Sale } from "@/lib/sale";
import { searchAll } from "@/lib/search";
import { formatCents, type Transaction } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/**
 * Global search — v0.6. One box, three grouped answers. Sales and
 * payments are ANSWERS (the row itself is the information); clients are
 * DOORS (tap → their page, because a client hit is almost always "show
 * me everything about Rosa", not "confirm Rosa exists").
 */
export default function SearchPanel({
  clients,
  sales,
  transactions,
  onOpenClient,
}: {
  clients: Client[];
  sales: Sale[];
  transactions: Transaction[];
  onOpenClient: (id: string) => void;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const results = trimmed
    ? searchAll(trimmed, { clients, sales, transactions })
    : null;
  const empty =
    results !== null &&
    results.clients.length === 0 &&
    results.sales.length === 0 &&
    results.transactions.length === 0;

  const clientName = (id: string | null): string =>
    id ? (clients.find((c) => c.id === id)?.name ?? "") : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          aria-label={t("search.label")}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {trimmed && (
          <button
            type="button"
            className="shrink-0 text-sm text-neutral-500 hover:underline"
            onClick={() => setQuery("")}
          >
            {t("search.clear")}
          </button>
        )}
      </div>

      {results && (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          {empty && (
            <p className="text-neutral-500">
              {t("search.noResults", { query: trimmed })}
            </p>
          )}

          {results.clients.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {t("search.clients")}
              </h3>
              <ul>
                {results.clients.map((client) => {
                  const owed = owedCents(
                    sales.filter((s) => s.clientId === client.id),
                  );
                  return (
                    <li key={client.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        onClick={() => onOpenClient(client.id)}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {client.name}
                        </span>
                        {owed > 0 && (
                          <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                            {t("search.owesShort", {
                              amount: formatCents(owed),
                            })}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {results.sales.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {t("search.sales")}
              </h3>
              <ul className="space-y-1.5">
                {results.sales.map((sale) => (
                  <li key={sale.id} className="flex items-baseline gap-2 px-1">
                    <span className="min-w-0 flex-1 truncate">
                      {sale.lineItems.map((i) => i.name).join(", ") || "—"}
                      {clientName(sale.clientId) && (
                        <span className="text-neutral-500">
                          {" "}
                          · {clientName(sale.clientId)}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {sale.date} ·{" "}
                      {sale.state === "open"
                        ? t("search.saleOpen")
                        : sale.state === "expected"
                          ? t("search.saleExpected")
                          : t("search.salePaid")}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCents(saleTotalCents(sale))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.transactions.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {t("search.payments")}
              </h3>
              <ul className="space-y-1.5">
                {results.transactions.map((tx) => (
                  <li key={tx.id} className="flex items-baseline gap-2 px-1">
                    <span className="min-w-0 flex-1 truncate">
                      {tx.payer || "—"}
                      {tx.memo && (
                        <span className="text-neutral-500"> · {tx.memo}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {tx.date || "—"}
                      {tx.direction === "out" && ` · ${t("search.expense")}`}
                    </span>
                    <span
                      className={`shrink-0 font-medium tabular-nums ${
                        tx.direction === "out" ? "text-red-600" : ""
                      }`}
                    >
                      {tx.direction === "out" ? "−" : ""}
                      {formatCents(tx.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
