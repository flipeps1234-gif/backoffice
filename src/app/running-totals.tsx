"use client";

import {
  formatCents,
  totalsByDirection,
  type Transaction,
} from "@/lib/transaction";
import { useLocale } from "./use-locale";

/** The number that climbs. Sticky, so it stays in view while sorting. */
export default function RunningTotals({
  transactions,
  expectedCents = 0,
  owedCents = 0,
}: {
  transactions: Transaction[];
  /** EXPECTED sales — owner says paid, no matched payment yet. Counted in
   *  the received figure per the owner's "show both" decision. */
  expectedCents?: number;
  /** OPEN sales. Shown beside received, NEVER blended into it. */
  owedCents?: number;
}) {
  const { t } = useLocale();
  const business = totalsByDirection(
    transactions.filter((tx) => tx.business === true),
  );
  const personal = totalsByDirection(
    transactions.filter((tx) => tx.business === false),
  );
  const businessCount = transactions.filter((tx) => tx.business === true).length;
  const personalCount = transactions.filter((tx) => tx.business === false).length;
  const left = transactions.filter((tx) => tx.business === null).length;

  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-neutral-200 bg-background/95 px-4 py-3 backdrop-blur">
      {/* Personal left, business right — matching the swipe directions:
          left = personal, right = business. The totals sit where the cards
          fly. */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {t("insights.personal")}
          </p>
          <p className="text-lg font-medium tabular-nums text-neutral-500">
            {formatCents(personal.inCents)}
          </p>
          <p className="text-xs text-neutral-500">
            {personal.outCents > 0 ? (
              <span>
                {t("insights.spent", { amount: formatCents(personal.outCents) })} ·{" "}
              </span>
            ) : null}
            {personalCount === 1
              ? t("insights.items.one", { n: personalCount })
              : t("insights.items.many", { n: personalCount })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {t("insights.business")}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600">
            {formatCents(business.inCents + expectedCents)}
          </p>
          {owedCents > 0 && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {t("insights.owed", { amount: formatCents(owedCents) })}
            </p>
          )}
          <p className="text-xs text-neutral-500">
            {business.outCents > 0 ? (
              <span className="text-red-500">
                {t("insights.spent", { amount: formatCents(business.outCents) })} ·{" "}
              </span>
            ) : null}
            {businessCount === 1
              ? t("insights.items.one", { n: businessCount })
              : t("insights.items.many", { n: businessCount })}
          </p>
        </div>
      </div>
      {left > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          {t("insights.leftToSort", { n: left })}
        </p>
      )}
    </div>
  );
}
