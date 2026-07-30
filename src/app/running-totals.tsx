import { formatCents, totalCents, type Transaction } from "@/lib/transaction";

/** The number that climbs. Sticky, so it stays in view while sorting. */
export default function RunningTotals({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const business = transactions.filter((tx) => tx.business === true);
  const personal = transactions.filter((tx) => tx.business === false);
  const left = transactions.filter((tx) => tx.business === null).length;

  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-neutral-200 bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Business
          </p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600">
            {formatCents(totalCents(business))}
          </p>
          <p className="text-xs text-neutral-500">
            {business.length} payment{business.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Personal
          </p>
          <p className="text-lg font-medium tabular-nums text-neutral-500">
            {formatCents(totalCents(personal))}
          </p>
          <p className="text-xs text-neutral-500">
            {personal.length} payment{personal.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      {left > 0 && (
        <p className="mt-2 text-xs text-neutral-500">{left} left to sort</p>
      )}
    </div>
  );
}
