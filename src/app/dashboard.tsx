"use client";

import { byMonth, marginByService, revenueByService } from "@/lib/dashboard";
import { everythingCsv, taxCsv } from "@/lib/csv";
import { formatCents, type Transaction } from "@/lib/transaction";
import type { Service } from "@/lib/service";

/**
 * The financial picture: money in vs out by month, revenue by service, and
 * the margin view. Margin is estimates (catalog cost field) and says so;
 * the CSV is actuals only. Charts are plain CSS bars — no chart library.
 */

const monthLabel = (month: string): string =>
  month === ""
    ? "No date"
    : new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });

export default function Dashboard({
  transactions,
  services,
  onClose,
}: {
  transactions: Transaction[];
  services: Service[];
  /** Omitted when embedded in the desktop rail — no takeover, no Close. */
  onClose?: () => void;
}) {
  const months = byMonth(transactions);
  const revenue = revenueByService(transactions, services);
  const margins = marginByService(transactions, services);

  const maxMonth = Math.max(
    1,
    ...months.map((m) => Math.max(m.inCents, m.outCents)),
  );
  const maxRevenue = Math.max(1, ...revenue.map((r) => r.revenueCents));

  function download(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const downloadTaxCsv = () =>
    download(
      taxCsv(transactions, services),
      "swipebooks-for-your-tax-preparer.csv",
    );

  const downloadEverythingCsv = () =>
    download(
      everythingCsv(transactions, services),
      "swipebooks-everything.csv",
    );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Dashboard</h2>
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

      {months.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nothing here yet — sort some business payments first.
        </p>
      ) : (
        <>
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Money in vs out
            </h3>
            <ul className="space-y-3">
              {months.map((m) => (
                <li key={m.month || "undated"}>
                  <p className="mb-1 text-sm font-medium">
                    {monthLabel(m.month)}
                  </p>
                  {/* The bar scales inside its own track, so the widest month
                      can hit 100% without shoving its amount off the row. */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div
                          className="h-3 rounded-sm bg-emerald-500"
                          style={{
                            width: `${Math.max(2, (m.inCents / maxMonth) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-500">
                        {formatCents(m.inCents)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div
                          className="h-3 rounded-sm bg-red-400"
                          style={{
                            width: `${Math.max(2, (m.outCents / maxMonth) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-500">
                        −{formatCents(m.outCents)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    kept: {m.inCents - m.outCents < 0 ? "−" : ""}
                    {formatCents(Math.abs(m.inCents - m.outCents))}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {revenue.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Revenue by service
              </h3>
              <ul className="space-y-2">
                {revenue.map((r) => (
                  <li key={r.serviceId ?? "none"}>
                    <div className="mb-0.5 flex items-baseline justify-between text-sm">
                      <span>{r.name}</span>
                      <span className="tabular-nums font-medium">
                        {formatCents(r.revenueCents)}
                        <span className="ml-1 text-xs font-normal text-neutral-500">
                          · {r.jobs} job{r.jobs === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-sm bg-emerald-500/70"
                      style={{
                        width: `${Math.max(2, (r.revenueCents / maxRevenue) * 100)}%`,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {margins.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Margin by service
              </h3>
              <p className="mb-2 text-xs text-neutral-500">
                Estimates, from the cost you set on each service — planning
                numbers, not tax numbers. The export below uses only what you
                actually logged.
              </p>
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
                {margins.map((m) => (
                  <li key={m.serviceId} className="px-3 py-2.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-neutral-900">{m.name}</span>
                      <span
                        className={`font-medium tabular-nums ${
                          m.marginCents >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {m.marginCents < 0 ? "−" : ""}
                        {formatCents(Math.abs(m.marginCents))}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {formatCents(m.estimableRevenueCents)} in −{" "}
                      {formatCents(m.estCostCents)} est. costs
                      {m.unestimatedJobs > 0 &&
                        ` · ${m.unestimatedJobs} job${m.unestimatedJobs === 1 ? "" : "s"} missing size, left out entirely`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </>
      )}

      {/* Outside the branch above on purpose. These used to live inside it, so
          a user whose rows were all personal or all still unsorted had NO
          export at all — and "never gate viewing or exporting a user's own
          data" is a permanent boundary, not a nice-to-have. */}
      {transactions.length > 0 && (
        <section className="space-y-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <button
            type="button"
            className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90"
            onClick={downloadTaxCsv}
          >
            Download CSV for your tax preparer
          </button>
          <p className="text-xs text-neutral-500">
            Actual business income and expenses, oldest first. Estimates are
            never included.
          </p>

          <button
            type="button"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            onClick={downloadEverythingCsv}
          >
            Download everything
          </button>
          <p className="text-xs text-neutral-500">
            Every row you&apos;ve logged — business, personal and not yet
            sorted — with a column saying which is which. Your data, whenever
            you want it.
          </p>
        </section>
      )}
    </div>
  );
}
