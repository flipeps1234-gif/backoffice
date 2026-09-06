/**
 * The landing page's "what is bookkeeping costing you?" estimate. Pure:
 * two numbers in, two numbers out, integer cents, no DOM.
 *
 * The one assumption is stated in the copy next to the sliders: with
 * contado the weekly bookkeeping shrinks to about CONTADO_MINUTES_PER_WEEK
 * (a few screenshots, a swipe). Everything else is the visitor's own
 * numbers. It is an estimate of their time's worth, never a promise of
 * revenue — the copy says so.
 */

/** A few screenshots and a swipe: what the core loop is built to cost. */
export const CONTADO_MINUTES_PER_WEEK = 15;

/** 52 weeks over 12 months, the honest "per month" multiplier. */
export const WEEKS_PER_MONTH = 52 / 12;

export type Savings = {
  /** Hours the visitor spends today, per month. */
  hoursPerMonthNow: number;
  /** Hours given back per month; never negative. */
  hoursSavedPerMonth: number;
  /** Those hours at the visitor's rate, integer cents; never negative. */
  moneySavedCentsPerMonth: number;
};

export const monthlySavings = (
  hourlyRateCents: number,
  weeklyHours: number,
  contadoMinutesPerWeek = CONTADO_MINUTES_PER_WEEK,
): Savings => {
  const rate = Number.isFinite(hourlyRateCents) ? Math.max(0, hourlyRateCents) : 0;
  const hours = Number.isFinite(weeklyHours) ? Math.max(0, weeklyHours) : 0;
  const hoursSavedPerWeek = Math.max(0, hours - contadoMinutesPerWeek / 60);
  const hoursSavedPerMonth = hoursSavedPerWeek * WEEKS_PER_MONTH;
  return {
    hoursPerMonthNow: hours * WEEKS_PER_MONTH,
    hoursSavedPerMonth,
    moneySavedCentsPerMonth: Math.round(hoursSavedPerMonth * rate),
  };
};

/** Slider ranges the calculator offers — dollars and hours, plain numbers. */
export const RATE_RANGE = { min: 10, max: 150, step: 5, initial: 35 } as const;
export const HOURS_RANGE = { min: 0.5, max: 12, step: 0.5, initial: 3 } as const;
