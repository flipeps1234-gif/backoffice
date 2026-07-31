import { buildInsights } from "@/lib/insights";
import type { Transaction } from "@/lib/transaction";

/** Three facts, shown the moment a batch is confirmed. Never gated. */
export default function Insights({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const insights = buildInsights(transactions);
  if (insights.length === 0) return null;

  return (
    <section
      aria-label="Insights"
      className="rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
        What we found
      </h2>
      <dl className="space-y-3">
        {insights.map((insight) => (
          <div key={insight.key} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-neutral-500">{insight.label}</dt>
            <dd className="text-right">
              <span className="block text-lg font-semibold tabular-nums text-neutral-900">
                {insight.value}
              </span>
              <span className="block text-xs text-neutral-500">
                {insight.detail}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
