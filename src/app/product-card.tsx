"use client";

import { priceLabel, UNIT_LABELS, type Service } from "@/lib/service";
import { formatCents } from "@/lib/transaction";

/**
 * The product card from the owner's sketch: name on top, Gain / Loss on
 * the left, Net on the right. One card style everywhere — the new-sale
 * picker (with qty steppers) and the products page (tap to edit) render
 * this same component, per the owner's call.
 *
 * Gain = what it sells for, Loss = what it costs you (the catalog's
 * ESTIMATE), Net = margin per unit. Estimates, never tax data.
 */
export default function ProductCard({
  service,
  quantity,
  onStep,
  onTap,
}: {
  service: Service;
  /** When set, the card is a PICKER: shows − qty + steppers. */
  quantity?: number;
  onStep?: (delta: 1 | -1) => void;
  /** When set (and no steppers), tapping the card fires this — edit mode. */
  onTap?: () => void;
}) {
  const price = service.pricing.cents;
  const cost = service.costCents;
  const net = cost === null ? null : price - cost;
  const perUnit =
    service.pricing.type === "rate"
      ? `/${UNIT_LABELS[service.pricing.unit]}`
      : "";
  const picking = quantity !== undefined;
  const selected = picking && quantity > 0;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold">{service.name}</p>
        {picking && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`One less ${service.name}`}
              disabled={quantity === 0}
              className="h-11 w-11 rounded-lg border border-neutral-300 text-xl font-medium text-neutral-900 disabled:opacity-30 dark:border-neutral-600 dark:text-neutral-100"
              onClick={(event) => {
                event.stopPropagation();
                onStep?.(-1);
              }}
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-semibold tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`One more ${service.name}`}
              className="h-11 w-11 rounded-lg border border-neutral-300 text-xl font-medium text-neutral-900 dark:border-neutral-600 dark:text-neutral-100"
              onClick={(event) => {
                event.stopPropagation();
                onStep?.(1);
              }}
            >
              +
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <dl className="space-y-0.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-10 text-neutral-500">Gain</dt>
            <dd className="tabular-nums">
              {priceLabel(service)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-10 text-neutral-500">Loss</dt>
            <dd className="tabular-nums text-neutral-600 dark:text-neutral-400">
              {cost === null ? "—" : `${formatCents(cost)}${perUnit}`}
            </dd>
          </div>
        </dl>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Net
          </p>
          <p
            className={`text-lg font-semibold tabular-nums ${
              net === null
                ? "text-neutral-400"
                : net >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
            }`}
          >
            {net === null ? "—" : `${net < 0 ? "−" : ""}${formatCents(Math.abs(net))}${perUnit}`}
          </p>
        </div>
      </div>
    </>
  );

  const frame = `w-full rounded-xl border p-4 text-left transition-colors ${
    selected
      ? "border-emerald-600 bg-emerald-600/10"
      : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
  }`;

  // A picker card's whole surface is "one more" — the biggest possible
  // target for a thumb in a driveway; the − button is the way back down.
  if (picking) {
    return (
      <button type="button" className={frame} onClick={() => onStep?.(1)}>
        {body}
      </button>
    );
  }
  if (onTap) {
    return (
      <button type="button" className={frame} onClick={onTap}>
        {body}
      </button>
    );
  }
  return <div className={frame}>{body}</div>;
}
