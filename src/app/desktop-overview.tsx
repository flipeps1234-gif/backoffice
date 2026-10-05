"use client";

import { useState, useSyncExternalStore } from "react";
import { revenueByService } from "@/lib/dashboard";
import { expectedCentsIn, seriesMonths, yearSeries, yearsWithData } from "@/lib/desktop";
import type { Sale } from "@/lib/sale";
import type { Service } from "@/lib/service";
import { formatCents, type Transaction } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/**
 * The desktop home's analytics: what the business kept this year, one
 * large month-by-month chart (kept / in / out), and revenue by service.
 * Pure rendering over the ledger the Ledger already holds — the money
 * rules are the app's own:
 *
 * - Business TRANSACTIONS only, the Reports card's basis (byMonth), so
 *   the two never disagree about a month; personal money stays out.
 * - Sales paid digitally but not matched yet (EXPECTED) are named beside
 *   the totals ("paid, waiting to match"), never folded in — they would
 *   move months when the payment lands. OPEN sales (owed) never blend in.
 * - The chart runs through the latest month with a dated row, so a row
 *   dated ahead never counts in the service bars but not the chart.
 * - "Still owed" is a today figure (all open sales), shown on this year.
 * - Undated rows can't sit on a month, so the chart skips them; the
 *   Reports card below (the app's Dashboard) still lists them.
 */

type Series = "kept" | "in" | "out";

const STEPS = [
  1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000,
  500000, 1000000, 2000000, 2500000, 5000000,
];

const axisLabel = (cents: number): string =>
  cents === 0
    ? "$0"
    : cents >= 100000
      ? `$${(cents / 100000).toFixed(cents % 100000 ? 1 : 0)}k`
      : `$${Math.round(cents / 100)}`;

/** Local calendar date, YYYY-MM-DD — the app's one rule for "today". */
const localToday = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const SERIES_COLOR: Record<Series, { line: string; fill: string; dot: string }> = {
  kept: { line: "stroke-emerald-600 dark:stroke-emerald-400", fill: "fill-emerald-600 dark:fill-emerald-400", dot: "fill-emerald-600 dark:fill-emerald-400" },
  in: { line: "stroke-emerald-800 dark:stroke-emerald-300", fill: "fill-emerald-800 dark:fill-emerald-300", dot: "fill-emerald-800 dark:fill-emerald-300" },
  out: { line: "stroke-red-500", fill: "fill-red-500", dot: "fill-red-500" },
};

/**
 * Is this a phone-width screen? The chart is an SVG scaled to its card:
 * drawn 820 units wide, its 12px labels shrink to ~4px on a 375px phone.
 * Below 640px it is drawn 360 wide instead (single-letter months, a
 * narrower callout) so the same labels land near 10px. Subscribed, not
 * measured in an effect; the server and first paint assume wide.
 */
const NARROW = "(max-width: 639px)";
const subscribeNarrow = (onChange: () => void) => {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useIsNarrow = (): boolean =>
  useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );

function Chart({
  values,
  inCents,
  outCents,
  monthNames,
  shortNames,
  series,
  seriesLabel,
  title,
  year,
  partialIndex,
  active,
  onActive,
  compact,
}: {
  /** Phone-width drawing (see useIsNarrow). */
  compact: boolean;
  values: number[];
  inCents: number[];
  outCents: number[];
  monthNames: string[];
  shortNames: string[];
  series: Series;
  seriesLabel: string;
  title: string;
  year: number;
  /** Index of the month still in progress (today's), or -1. */
  partialIndex: number;
  active: number;
  onActive: (i: number) => void;
}) {
  const { t } = useLocale();
  const W = compact ? 360 : 820;
  const H = compact ? 280 : 340;
  const L = compact ? 48 : 64;
  const R = compact ? 12 : 24;
  const T = 16;
  const B = 36;
  const pw = W - L - R;
  const ph = H - T - B;
  const n = values.length;
  // Kept can be negative (a month that spent more than it made): the
  // axis then runs below zero instead of clipping the line.
  const hi = Math.max(...values, 0);
  const lo = Math.min(...values, 0);
  const span = Math.max(hi - lo, 1);
  const step = STEPS.find((s) => Math.ceil(span / s) <= 6) ?? 5000000;
  const top = Math.max(Math.ceil(hi / step) * step, step);
  const bottom = Math.floor(lo / step) * step;
  const x = (i: number) => (n === 1 ? L + pw / 2 : L + (pw * i) / (n - 1));
  const y = (v: number) => T + ph - ((v - bottom) / (top - bottom)) * ph;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const base = y(Math.max(bottom, 0));
  const area = `${line} L${x(n - 1)} ${base} L${x(0)} ${base} Z`;
  const ticks: number[] = [];
  for (let v = bottom; v <= top; v += step) ticks.push(v);
  const slot = n === 1 ? pw : pw / (n - 1);
  const color = SERIES_COLOR[series];
  const money = (c: number) => (c < 0 ? `−${formatCents(-c)}` : formatCents(c));

  // The callout sits beside the active point, flipped left past midway.
  // Wide enough for five-figure amounts in ES/PT ("$123,456.78 entró ·
  // $12,345.67 salió" measures ~194px in 11px Arial), and kept inside the
  // plot on both sides.
  // Compact: 200 wide with 14px/10px type holds the same strings.
  const boxW = compact ? 200 : 236;
  const bx = Math.min(
    Math.max(active > (n - 1) / 2 ? x(active) - boxW - 16 : x(active) + 16, L),
    W - R - boxW,
  );
  // Above the point when there is room. When there is not: beside it at
  // the top if the box clears the point sideways, otherwise BELOW it — on
  // the compact drawing the box is wider than half the plot, so for
  // mid-year months it would sit on the highlighted dot.
  const px = x(active);
  const py = y(values[active]);
  const spansPoint = bx <= px && px <= bx + boxW;
  const by = Math.min(py - 84 >= T ? py - 84 : spansPoint ? py + 14 : T, T + ph - 76);
  const monthTitle =
    active === partialIndex
      ? t("desktop.chart.soFar", { month: monthNames[active] })
      : monthNames[active];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="group"
      aria-label={t("desktop.chart.aria", {
        title,
        year,
        month: monthNames[active],
        amount: money(values[active]),
      })}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={L}
            x2={W - R}
            y1={y(tick)}
            y2={y(tick)}
            className={tick === 0 ? "stroke-neutral-400 dark:stroke-neutral-600" : "stroke-neutral-200 dark:stroke-neutral-800"}
          />
          <text x={L - 12} y={y(tick) + 4} textAnchor="end" fontSize="12" className="fill-neutral-500">
            {tick < 0 ? `−${axisLabel(-tick)}` : axisLabel(tick)}
          </text>
        </g>
      ))}
      <path d={area} className={color.fill} fillOpacity={0.1} />
      <path d={line} fill="none" className={color.line} strokeWidth={2.5} strokeLinejoin="round" />
      <line
        x1={x(active)}
        x2={x(active)}
        y1={T}
        y2={T + ph}
        className="stroke-neutral-400"
        strokeDasharray="4 4"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === active ? 6 : 3.5}
          className={`${color.line} ${i === active ? color.dot : "fill-background"}`}
          strokeWidth={2}
        />
      ))}
      {shortNames.map((m, i) => (
        <text
          // Index, not the label: narrow month names repeat (J, J, J).
          key={i}
          x={x(i)}
          y={H - 10}
          textAnchor="middle"
          fontSize="12"
          fontWeight={i === active ? 600 : 400}
          className={i === active ? "fill-foreground" : "fill-neutral-500"}
        >
          {m}
        </text>
      ))}
      <g pointerEvents="none">
        <rect x={bx} y={by} width={boxW} height={72} rx={8} className="fill-black dark:fill-neutral-700" />
        <text x={bx + 14} y={by + 24} fontSize="12" fill="#a3a3a3">
          {monthTitle}
        </text>
        <text x={bx + 14} y={by + 46} fontSize={compact ? 14 : 16} fontWeight={600} fill="#ededed">
          {money(values[active])} · {seriesLabel}
        </text>
        <text x={bx + 14} y={by + 63} fontSize={compact ? 10 : 11} fill="#a3a3a3">
          {t("desktop.chart.split", {
            inAmount: formatCents(inCents[active]),
            outAmount: formatCents(outCents[active]),
          })}
        </text>
      </g>
      {values.map((_, i) => (
        <rect
          key={i}
          x={x(i) - slot / 2}
          y={T}
          width={slot}
          height={ph + B - 4}
          fill="transparent"
          tabIndex={0}
          role="button"
          // The name carries the value, so a screen reader hears the
          // month's figure on focus, not just "Show March".
          aria-label={t("desktop.chart.point", {
            month: i === partialIndex ? t("desktop.chart.soFar", { month: monthNames[i] }) : monthNames[i],
            amount: money(values[i]),
            series: seriesLabel,
          })}
          onPointerEnter={() => onActive(i)}
          onFocus={() => onActive(i)}
          onClick={() => onActive(i)}
          strokeWidth={2}
          className="cursor-pointer outline-none focus-visible:stroke-neutral-500"
        />
      ))}
    </svg>
  );
}

function Toggle<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 rounded-full border border-neutral-300 bg-background p-1 dark:border-neutral-700"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors ${
            value === o.value
              ? "bg-foreground text-background"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DesktopOverview({
  transactions,
  sales,
  services,
  owedCents,
  pendingCount,
  loadFailed,
  onOwed,
}: {
  transactions: Transaction[];
  sales: Sale[];
  services: Service[];
  owedCents: number;
  /** Rows read from screenshots and not sorted yet — they are not on
   *  the chart until sorted, and the empty state says so. */
  pendingCount: number;
  /** The ledger never loaded: the in-memory rows are empty-but-wrong, so
   *  no total may be drawn from them (the Reports card and uploads obey
   *  the same flag). */
  loadFailed: boolean;
  onOwed: () => void;
}) {
  const { t, tag } = useLocale();
  const compact = useIsNarrow();
  const today = localToday();
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));

  const years = yearsWithData(transactions, sales, thisYear);

  const [year, setYear] = useState(thisYear);
  const [series, setSeries] = useState<Series>("kept");
  const monthCount = seriesMonths(transactions, year, thisYear, thisMonth);
  // The month the chart opens on: today's for this year (a row dated
  // ahead extends the series but must not steal focus), December before.
  const homeMonth = (y: number) => (y === thisYear ? thisMonth - 1 : 11);
  const [active, setActive] = useState(homeMonth(thisYear));
  const safeActive = Math.min(active, monthCount - 1);

  const monthKey = (i: number) => `${year}-${String(i + 1).padStart(2, "0")}`;
  const { inCents, outCents, keptCents } = yearSeries(transactions, year, monthCount);
  const expectedCents = expectedCentsIn(sales, year);
  const yearTxns = transactions.filter(
    (tx) => tx.business === true && tx.date && tx.date.startsWith(`${year}-`),
  );
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const totalIn = sum(inCents);
  const totalOut = sum(outCents);
  const totalKept = totalIn - totalOut;

  const monthNames = Array.from({ length: monthCount }, (_, i) =>
    new Date(`${monthKey(i)}-01T00:00:00Z`).toLocaleDateString(tag, { month: "long", timeZone: "UTC" }),
  );
  const shortNames = Array.from({ length: monthCount }, (_, i) =>
    new Date(`${monthKey(i)}-01T00:00:00Z`).toLocaleDateString(tag, {
      // One letter per month on a phone: twelve "sept." do not fit.
      month: compact ? "narrow" : "short",
      timeZone: "UTC",
    }),
  );

  const values = series === "kept" ? keptCents : series === "in" ? inCents : outCents;
  const chartTitle = t(`desktop.chart.${series}`);
  const seriesLabel = t(`desktop.series.${series}`);

  const services_ = revenueByService(yearTxns, services).filter((s) => s.revenueCents > 0).slice(0, 6);
  const [pickedRaw, setPicked] = useState(0);
  const picked = Math.min(pickedRaw, Math.max(services_.length - 1, 0));
  const pickedService = services_[picked];
  const topRevenue = Math.max(services_[0]?.revenueCents ?? 1, 1);
  const serviceName = (s: (typeof services_)[number]) => (s.serviceId ? s.name : t("desktop.noService"));
  const money = (c: number) => (c < 0 ? `−${formatCents(-c)}` : formatCents(c));
  const hasData = totalIn > 0 || totalOut > 0;

  const card = "rounded-xl border border-neutral-300 bg-background dark:border-neutral-700";

  if (loadFailed) {
    // Hooks above always run; only the drawing is withheld. A $0.00 year
    // after a network failure would read as the truth.
    return (
      // The red "couldn't load" banner above says what went wrong; this
      // card only says why its totals are missing.
      <section className={`${card} p-6`}>
        <p className="py-10 text-center text-sm text-neutral-500">{t("desktop.loadWaiting")}</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {year === thisYear ? t("desktop.keptSoFar", { year }) : t("desktop.keptIn", { year })}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight tabular-nums">{money(totalKept)}</h1>
          <p className="text-sm text-neutral-500">
            <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
              {t("desktop.amountIn", { amount: formatCents(totalIn) })}
            </span>
            {" · "}
            <span className="tabular-nums text-red-600 dark:text-red-400">
              {t("desktop.amountOut", { amount: formatCents(totalOut) })}
            </span>
            {expectedCents > 0 && (
              <>
                {" · "}
                <span className="tabular-nums">
                  {t("desktop.amountExpected", { amount: formatCents(expectedCents) })}
                </span>
              </>
            )}
            {year === thisYear && owedCents > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onOwed}
                  className="tabular-nums text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  {t("desktop.amountOwed", { amount: formatCents(owedCents) })}
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {years.length > 1 && (
            <Toggle
              label={t("desktop.year")}
              value={year}
              onChange={(y) => {
                setYear(y);
                setActive(homeMonth(y));
                setPicked(0);
              }}
              options={years.map((y) => ({ value: y, label: String(y) }))}
            />
          )}
          <Toggle
            label={t("desktop.chartShows")}
            value={series}
            onChange={setSeries}
            options={[
              { value: "kept", label: t("desktop.series.kept") },
              { value: "in", label: t("desktop.series.in") },
              { value: "out", label: t("desktop.series.out") },
            ]}
          />
        </div>
      </div>

      <section className={`${card} flex flex-col gap-3 px-5 py-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{chartTitle}</h2>
          <span className="text-xs text-neutral-500">
            {t("desktop.chart.hint", { amount: money(sum(values)) })}
          </span>
        </div>
        {hasData ? (
          <Chart
            values={values}
            inCents={inCents}
            outCents={outCents}
            monthNames={monthNames}
            shortNames={shortNames}
            compact={compact}
            series={series}
            seriesLabel={seriesLabel}
            title={chartTitle}
            year={year}
            partialIndex={year === thisYear ? thisMonth - 1 : -1}
            active={safeActive}
            onActive={setActive}
          />
        ) : (
          <p className="py-16 text-center text-sm text-neutral-500">
            {pendingCount > 0
              ? t("desktop.emptyPending")
              : expectedCents > 0
                ? t("desktop.emptyExpected")
                : year === thisYear && owedCents > 0
                  ? t("desktop.emptyOwed")
                  : t("desktop.empty", { year })}
          </p>
        )}
      </section>

      {services_.length > 0 && (
        <section className={`${card} flex flex-col gap-4 p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">{t("desktop.revenueYear", { year })}</h2>
            {pickedService && (
              <span className="text-xs tabular-nums text-neutral-500">
                {t("desktop.serviceDetail", {
                  name: serviceName(pickedService),
                  jobs:
                    pickedService.jobs === 1
                      ? t("dash.jobs.one", { n: pickedService.jobs })
                      : t("dash.jobs.many", { n: pickedService.jobs }),
                  amount: formatCents(Math.round(pickedService.revenueCents / Math.max(pickedService.jobs, 1))),
                })}
              </span>
            )}
          </div>
          <div className="flex h-52 items-stretch justify-center gap-3.5">
            {services_.map((s, i) => (
              <button
                key={s.serviceId ?? "none"}
                type="button"
                aria-pressed={picked === i}
                onClick={() => setPicked(i)}
                onPointerEnter={() => setPicked(i)}
                className="flex min-w-0 max-w-40 flex-1 flex-col items-center justify-end gap-2 rounded-md"
              >
                <span className="text-sm font-semibold tabular-nums">{axisLabel(s.revenueCents)}</span>
                <span
                  className={`w-full rounded-t-md transition-colors ${
                    picked === i ? "bg-emerald-600" : "bg-emerald-300 dark:bg-emerald-800"
                  }`}
                  style={{ height: `${Math.max(4, Math.round((s.revenueCents / topRevenue) * 130))}px` }}
                />
                <span className="w-full truncate text-center text-xs text-neutral-500">{serviceName(s)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
