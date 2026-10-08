"use client";

import { useState } from "react";
import {
  CONTADO_MINUTES_PER_WEEK,
  HOURS_RANGE,
  RATE_RANGE,
  monthlySavings,
} from "@/lib/savings";
import { formatCents } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/**
 * Two sliders — the visitor's hourly rate and the hours a week they spend
 * on receipts and payments — and the two numbers they imply: hours back
 * every month and what those hours are worth at their rate. The math is
 * src/lib/savings.ts. The one assumption (about 15 minutes a week with
 * contado — our design target, not a measurement) and "an estimate, not
 * a promise" sit directly under the result at body size, never in fine
 * print: the caveat travels with the number it qualifies.
 *
 * Styling stays inside design-tokens.md: the Owed big-number for hours,
 * the business-total green for money, native range inputs in emerald.
 */
export default function SavingsCalculator() {
  const { t, tag } = useLocale();
  const [rate, setRate] = useState<number>(RATE_RANGE.initial);
  const [hours, setHours] = useState<number>(HOURS_RANGE.initial);
  const savings = monthlySavings(rate * 100, hours);
  const oneDecimal = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });

  return (
    <section className="mt-14 space-y-6" aria-labelledby="savings-title">
      <div className="space-y-2">
        <h2 id="savings-title" className="text-base font-semibold">
          {t("landing.savingsTitle")}
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t("landing.savingsBody", { minutes: CONTADO_MINUTES_PER_WEEK })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-6">
          <Slider
            id="savings-rate"
            label={t("landing.savingsRate")}
            value={rate}
            valueLabel={t("landing.savingsRateValue", { rate: formatCents(rate * 100) })}
            range={RATE_RANGE}
            onChange={setRate}
          />
          <Slider
            id="savings-hours"
            label={t("landing.savingsHours")}
            value={hours}
            valueLabel={t("landing.savingsHoursValue", { hours: oneDecimal.format(hours) })}
            range={HOURS_RANGE}
            onChange={setHours}
          />
        </div>

        <div>
          <div
            className="rounded-xl border border-neutral-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
            aria-live="polite"
          >
            <div className="text-4xl font-semibold tabular-nums">
              {oneDecimal.format(savings.hoursSavedPerMonth)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{t("landing.savingsHoursOut")}</div>
            <div className="mt-4 text-2xl font-semibold tabular-nums text-emerald-600">
              {formatCents(savings.moneySavedCentsPerMonth)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{t("landing.savingsMoneyOut")}</div>
          </div>
          {/* Outside the live region (it never changes, so it shouldn't be
              re-announced on every slider move), but right under it. */}
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            {t("landing.savingsNote", { minutes: CONTADO_MINUTES_PER_WEEK })}
          </p>
        </div>
      </div>
    </section>
  );
}

function Slider({
  id,
  label,
  value,
  valueLabel,
  range,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
  range: { readonly min: number; readonly max: number; readonly step: number };
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {label}
        </label>
        <span className="text-sm font-medium tabular-nums">{valueLabel}</span>
      </div>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-emerald-600"
      />
    </div>
  );
}
