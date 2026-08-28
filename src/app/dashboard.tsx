"use client";

import { useEffect, useState } from "react";
import { byMonth, marginByService, revenueByService } from "@/lib/dashboard";
import type { Client } from "@/lib/client";
import { everythingCsv, mileageCsv, taxCsv } from "@/lib/csv";
import { downloadCsv } from "./download";
import type { BusinessProfile } from "@/lib/profile";
import { formatMiles, mileageLog, totalTenths } from "@/lib/mileage";
import type { NotificationPrefs } from "@/lib/notify/types";
import type { RecurringTemplate } from "@/lib/recurring";
import type { Sale } from "@/lib/sale";
import { quarterIncomeCents, quarterOf, setAsideCents } from "@/lib/setaside";
import { formatCents, type Transaction } from "@/lib/transaction";
import type { Service } from "@/lib/service";
import { useLocale } from "./use-locale";

/**
 * The financial picture: money in vs out by month, revenue by service, and
 * the margin view. Margin is estimates (catalog cost field) and says so;
 * the CSV is actuals only. Charts are plain CSS bars — no chart library.
 *
 * v0.6.5 adds the tax story: a set-aside NUDGE (information, never a tax
 * engine), the computed mileage estimate, and a proof-of-income view that
 * prints through the browser — window.print IS the PDF export, no
 * dependency, and the print CSS in globals.css isolates the document.
 */

const monthLabel = (month: string, tag: string, noDate: string): string =>
  month === ""
    ? noDate
    : new Date(`${month}-01T00:00:00Z`).toLocaleDateString(tag, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });

/** Same local-calendar rule as everywhere else in the app. */
const localToday = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export default function Dashboard({
  transactions,
  services,
  sales,
  clients,
  templates,
  photoSaleIds,
  profile,
  notifyPrefs,
  onClose,
  exportsBlocked,
}: {
  transactions: Transaction[];
  services: Service[];
  sales: Sale[];
  clients: Client[];
  /** For the everything-export only — the file is the user's pre-delete
   *  copy, so it carries the whole data model, templates included. */
  templates: RecurringTemplate[];
  /** Sales with a server-side photo (bytes load per client on demand) —
   *  keeps the export's yes/no photo column truthful. Optional: the
   *  public demos render this component with fixtures and no set. */
  photoSaleIds?: ReadonlySet<string>;
  /** Business name/owner/state — tops the tax CSV and the proof title. */
  profile: BusinessProfile;
  /** Phone + consent timestamps — the everything-export carries them so
   *  the pre-delete copy is actually complete. Optional: public demos. */
  notifyPrefs?: NotificationPrefs | null;
  /** Omitted when embedded in the desktop rail — no takeover, no Close. */
  onClose?: () => void;
  /** True after a FAILED transactions load: the in-memory ledger is
   *  empty-but-wrong, so every CSV here would silently omit payments.
   *  The buttons make way for the load error instead. */
  exportsBlocked?: boolean;
}) {
  const { t, tag } = useLocale();
  const [proofOpen, setProofOpen] = useState(false);

  // The print CSS keys on this class (not :has() — see globals.css).
  useEffect(() => {
    if (!proofOpen) return;
    document.body.classList.add("printing-proof");
    return () => document.body.classList.remove("printing-proof");
  }, [proofOpen]);
  const months = byMonth(transactions);
  const revenue = revenueByService(transactions, services);
  const margins = marginByService(transactions, services);

  const today = localToday();
  const quarterIncome = quarterIncomeCents(transactions, today);

  // Mileage: this calendar year's logged visits to clients whose
  // round-trip distance is on file. An estimate assembled from two
  // owner-typed facts — never GPS.
  const distanceByClient = new Map(
    clients
      .filter((c) => c.distanceTenths !== null && c.distanceTenths > 0)
      .map((c) => [c.id, c.distanceTenths as number]),
  );
  const year = today.slice(0, 4);
  const mileage = mileageLog(
    distanceByClient,
    sales.filter((s) => s.date.startsWith(year)),
  );

  // ---- proof of income: a printable document, not a dashboard ----
  if (proofOpen) {
    const totalIn = months.reduce((sum, m) => sum + m.inCents, 0);
    return (
      <div
        data-print-root
        className="space-y-5 rounded-lg bg-white p-5 text-neutral-900 print:rounded-none print:p-0"
      >
        <div className="flex items-baseline justify-between print:hidden">
          <button
            type="button"
            className="text-sm text-neutral-500 hover:underline"
            onClick={() => setProofOpen(false)}
          >
            {t("common.back")}
          </button>
          <button
            type="button"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => window.print()}
          >
            {t("dash.proofPrint")}
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            {profile.businessName || "contado"} — {t("dash.proofTitle")}
          </h2>
          {(profile.ownerName || profile.usState) && (
            <p className="text-sm text-neutral-700">
              {[profile.ownerName, profile.usState].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-sm text-neutral-500">
            {t("dash.proofGenerated", { date: today })}
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left">
              <th className="py-2 font-medium">{t("dash.proofMonth")}</th>
              <th className="py-2 text-right font-medium">
                {t("dash.proofIncome")}
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month || "undated"} className="border-b border-neutral-200">
                <td className="py-2">
                  {monthLabel(m.month, tag, t("dash.noDate"))}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCents(m.inCents)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2 font-semibold">{t("dash.proofTotal")}</td>
              <td className="py-2 text-right font-semibold tabular-nums">
                {formatCents(totalIn)}
              </td>
            </tr>
          </tbody>
        </table>

        {mileage.length > 0 && (
          <p className="text-sm text-neutral-600">
            {t("dash.proofMileage", {
              miles: formatMiles(totalTenths(mileage)),
              year,
            })}
          </p>
        )}

        <p className="text-xs text-neutral-500">{t("dash.proofDisclaimer")}</p>
      </div>
    );
  }

  const maxMonth = Math.max(
    1,
    ...months.map((m) => Math.max(m.inCents, m.outCents)),
  );
  const maxRevenue = Math.max(1, ...revenue.map((r) => r.revenueCents));

  const downloadTaxCsv = () =>
    downloadCsv(
      taxCsv(transactions, services, profile),
      "contado-for-your-tax-preparer.csv",
    );

  const downloadEverythingCsv = () =>
    downloadCsv(
      everythingCsv(transactions, services, sales, clients, templates, photoSaleIds, profile, notifyPrefs),
      "contado-everything.csv",
    );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("dash.title")}</h2>
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

      {months.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("dash.empty")}</p>
      ) : (
        <>
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("dash.moneyInOut")}
            </h3>
            <ul className="space-y-3">
              {months.map((m) => (
                <li key={m.month || "undated"}>
                  <p className="mb-1 text-sm font-medium">
                    {monthLabel(m.month, tag, t("dash.noDate"))}
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
                    {t("dash.kept", {
                      amount: `${m.inCents - m.outCents < 0 ? "−" : ""}${formatCents(Math.abs(m.inCents - m.outCents))}`,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {revenue.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {t("dash.revenueByService")}
              </h3>
              <ul className="space-y-2">
                {revenue.map((r) => (
                  <li key={r.serviceId ?? "none"}>
                    <div className="mb-0.5 flex items-baseline justify-between text-sm">
                      <span>{r.name}</span>
                      <span className="tabular-nums font-medium">
                        {formatCents(r.revenueCents)}
                        <span className="ml-1 text-xs font-normal text-neutral-500">
                          ·{" "}
                          {r.jobs === 1
                            ? t("dash.jobs.one", { n: r.jobs })
                            : t("dash.jobs.many", { n: r.jobs })}
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
                {t("dash.marginByService")}
              </h3>
              <p className="mb-2 text-xs text-neutral-500">
                {t("dash.marginNote")}
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
                      {t("dash.marginMath", {
                        in: formatCents(m.estimableRevenueCents),
                        cost: formatCents(m.estCostCents),
                      })}
                      {m.unestimatedJobs > 0 &&
                        ` · ${
                          m.unestimatedJobs === 1
                            ? t("dash.missingSize.one", { n: m.unestimatedJobs })
                            : t("dash.missingSize.many", { n: m.unestimatedJobs })
                        }`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </>
      )}

      {/* Set-aside NUDGE — information, never a tax engine. 25% is the
          middle of the range every guide repeats, not something computed
          about THIS business, and the copy says so. */}
      {quarterIncome > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("dash.setAsideTitle", { q: quarterOf(today).quarter })}
          </h3>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {t("dash.setAsideBody", {
              income: formatCents(quarterIncome),
              amount: formatCents(setAsideCents(quarterIncome)),
            })}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {t("dash.setAsideNotAdvice")}
          </p>
        </section>
      )}

      {/* Mileage estimate — appears once any client has a distance. */}
      {mileage.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("dash.mileageTitle")}
          </h3>
          <p className="text-sm">
            {t(
              mileage.length === 1
                ? "dash.mileageSummary.one"
                : "dash.mileageSummary.many",
              {
                visits: mileage.length,
                miles: formatMiles(totalTenths(mileage)),
                year,
              },
            )}
          </p>
          <p className="mb-2 text-xs text-neutral-500">{t("dash.mileageNote")}</p>
          <button
            type="button"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            onClick={() =>
              downloadCsv(mileageCsv(mileage, clients), "contado-mileage.csv")
            }
          >
            {t("dash.mileageCsv")}
          </button>
        </section>
      )}

      {/* Proof of income — a printable statement of what THEY logged. */}
      {months.length > 0 && (
        <section>
          <button
            type="button"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            onClick={() => setProofOpen(true)}
          >
            {t("dash.proofButton")}
          </button>
        </section>
      )}

      {/* After a FAILED load the CSVs would silently miss every payment —
          worse than no export, because the delete flow calls this file the
          user's copy. Show the load error where the buttons were; a reload
          brings them back. (This is a failed check refusing to impersonate
          an empty ledger, not a gate on the user's data.) */}
      {exportsBlocked && (
        <p className="border-t border-neutral-200 pt-5 text-sm text-red-700 dark:border-neutral-800 dark:text-red-400">
          {t("home.errLoadFailed")}
        </p>
      )}

      {/* Outside the branch above on purpose. These used to live inside it, so
          a user whose rows were all personal or all still unsorted had NO
          export at all — and "never gate viewing or exporting a user's own
          data" is a permanent boundary, not a nice-to-have. */}
      {!exportsBlocked && transactions.length > 0 && (
        <section className="space-y-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <button
            type="button"
            className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90"
            onClick={downloadTaxCsv}
          >
            {t("dash.downloadTax")}
          </button>
          <p className="text-xs text-neutral-500">{t("dash.taxNote")}</p>

          <button
            type="button"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            onClick={downloadEverythingCsv}
          >
            {t("dash.downloadAll")}
          </button>
          <p className="text-xs text-neutral-500">{t("dash.allNote")}</p>
        </section>
      )}
    </div>
  );
}
