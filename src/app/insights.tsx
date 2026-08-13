"use client";

import { buildInsights, type Insight } from "@/lib/insights";
import { formatCents, type Transaction } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/** Three facts, shown the moment a batch is confirmed. Never gated.
 *  The lib hands over numbers and dates; every word is composed here,
 *  trilingually. EN output is byte-identical to the pre-v0.6 sentences. */
export default function Insights({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const { t, tag } = useLocale();
  const insights = buildInsights(transactions);
  if (insights.length === 0) return null;

  /** "2026-07-14" → "Jul 14" / "14 jul". UTC so the day never shifts. */
  const shortDate = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(tag, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  const payments = (count: number): string =>
    t(count === 1 ? "insights.paymentCount.one" : "insights.paymentCount.many", {
      count,
    });

  const render = (
    insight: Insight,
  ): { label: string; value: string; detail: string } => {
    switch (insight.key) {
      case "period": {
        let detail = payments(insight.payments);
        if (insight.spentCents > 0) {
          detail += t(
            insight.expenses === 1
              ? "insights.expenseTail.one"
              : "insights.expenseTail.many",
            { amount: formatCents(insight.spentCents), count: insight.expenses },
          );
        }
        detail +=
          insight.firstDate === null
            ? t("insights.noDatesTail")
            : insight.firstDate === insight.lastDate
              ? t("insights.onDate", { date: shortDate(insight.firstDate) })
              : t("insights.dateRangeTail", {
                  first: shortDate(insight.firstDate),
                  last: shortDate(insight.lastDate ?? insight.firstDate),
                });
        return {
          label: t("insights.totalRead"),
          value: formatCents(insight.totalCents),
          detail,
        };
      }
      case "busiest":
        return {
          label: t(
            insight.kind === "best" ? "insights.bestDay" : "insights.busiestDay",
          ),
          value: insight.date ? shortDate(insight.date) : "—",
          detail:
            insight.kind === "noIncome"
              ? t("insights.noIncome")
              : insight.kind === "noDates"
                ? t("insights.noDatesRead")
                : insight.kind === "best"
                  ? formatCents(insight.cents)
                  : `${payments(insight.count)}, ${formatCents(insight.cents)}`,
        };
      case "payer":
        return {
          label: t("insights.topPayer"),
          value: insight.name ?? "—",
          detail:
            insight.kind === "noIncome"
              ? t("insights.noIncome")
              : insight.kind === "noNames"
                ? t("insights.noNames")
                : t(
                    insight.count === 1
                      ? "insights.acrossPayments.one"
                      : "insights.acrossPayments.many",
                    { amount: formatCents(insight.cents), count: insight.count },
                  ),
        };
    }
  };

  return (
    <section
      aria-label={t("insights.sectionLabel")}
      className="rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {t("insights.title")}
      </h2>
      <dl className="space-y-3">
        {insights.map((insight) => {
          const { label, value, detail } = render(insight);
          return (
            <div
              key={insight.key}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="text-sm text-neutral-500">{label}</dt>
              <dd className="text-right">
                <span className="block text-lg font-semibold tabular-nums text-neutral-900">
                  {value}
                </span>
                <span className="block text-xs text-neutral-500">{detail}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
