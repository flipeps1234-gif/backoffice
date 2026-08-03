import {
  formatCents,
  totalsByDirection,
  type Transaction,
} from "@/lib/transaction";

/** The number that climbs. Sticky, so it stays in view while sorting. */
export default function RunningTotals({
  transactions,
}: {
  transactions: Transaction[];
}) {
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
            Personal
          </p>
          <p className="text-lg font-medium tabular-nums text-neutral-500">
            {formatCents(personal.inCents)}
          </p>
          <p className="text-xs text-neutral-500">
            {personal.outCents > 0 ? (
              <span>−{formatCents(personal.outCents)} spent · </span>
            ) : null}
            {personalCount} item{personalCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Business
          </p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600">
            {formatCents(business.inCents)}
          </p>
          <p className="text-xs text-neutral-500">
            {business.outCents > 0 ? (
              <span className="text-red-500">
                −{formatCents(business.outCents)} spent ·{" "}
              </span>
            ) : null}
            {businessCount} item{businessCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      {left > 0 && (
        <p className="mt-2 text-xs text-neutral-500">{left} left to sort</p>
      )}
    </div>
  );
}
