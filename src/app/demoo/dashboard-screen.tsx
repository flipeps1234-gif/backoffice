"use client";

import { useState } from "react";
import { formatCents } from "@/lib/transaction";
import { DEMO_TODAY, MONTHS, MONTH_NAMES, daysBetween } from "./data";
import { Icon, Segmented, card } from "./ui";

type Series = "kept" | "in" | "out";

/** Revenue and job count per product (the Products screen reads these). */
export type ServiceTotal = { id: string; name: string; cents: number; jobs: number };

export type OwedRow = { id: string; name: string; date: string; cents: number };

const STEPS = [
  1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000,
  500000, 1000000, 2000000, 2500000, 5000000,
];
const axisLabel = (cents: number) =>
  cents === 0
    ? "$0"
    : cents >= 100000
      ? `$${(cents / 100000).toFixed(cents % 100000 ? 1 : 0)}k`
      : `$${Math.round(cents / 100)}`;
const sum = (a: number[]) => a.reduce((t, v) => t + v, 0);
const money = (c: number) => (c < 0 ? `−${formatCents(-c)}` : formatCents(c));

const SERIES: Record<Series, { label: string; title: string; color: string }> = {
  kept: { label: "kept", title: "Kept, month by month", color: "#059669" },
  in: { label: "in", title: "Money in, month by month", color: "#065f46" },
  out: { label: "out", title: "Money out, month by month", color: "#ef4444" },
};

/**
 * The desktop home's month chart in its phone-width drawing — the same
 * geometry as desktop-overview.tsx's compact Chart (360 × 280, a line
 * over a soft area, one dot a month, a dashed marker and a black callout
 * on the month in view). Copied rather than imported so this preview
 * shares no code with the product; the one difference is where the
 * callout goes when it would cover other months' dots (see `by`).
 */
function MonthChart({
  values,
  inCents,
  outCents,
  series,
  active,
  onActive,
}: {
  values: number[];
  inCents: number[];
  outCents: number[];
  series: Series;
  active: number;
  onActive: (i: number) => void;
}) {
  const W = 360;
  const H = 280;
  const L = 48;
  const R = 12;
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
  const { color, label, title } = SERIES[series];
  const partial = n - 1; // the demo's "today" is inside the last month

  const boxW = 200;
  const px = x(active);
  const py = y(values[active]);
  const bx = Math.min(Math.max(active > (n - 1) / 2 ? px - boxW - 16 : px + 16, L), W - R - boxW);
  // Above the point when that spot is clear. A month still in progress
  // is usually LOWER than the ones before it, and the box (wider than
  // half the plot) would then sit on their dots — so when any dot falls
  // under it, it goes below the lowest of them instead, in the shaded
  // area, and only falls back to the top edge when neither fits.
  const under = values
    .map((v, i) => ({ px: x(i), py: y(v) }))
    .filter((p) => p.px >= bx - 6 && p.px <= bx + boxW + 6);
  const above = py - 84;
  const clearAbove = above >= T && under.every((p) => p.py < above - 6 || p.py > above + 78);
  const below = Math.max(py, ...under.map((p) => p.py)) + 14;
  const by = clearAbove ? above : below <= T + ph - 76 ? below : Math.min(Math.max(above, T), T + ph - 76);
  const monthTitle = (i: number) => (i === partial ? `${MONTH_NAMES[i]} so far` : MONTH_NAMES[i]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="group"
      aria-label={`${title}, 2026. ${MONTH_NAMES[active]}: ${money(values[active])}`}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "#a3a3a3" : "#e5e5e5"} />
          <text x={L - 12} y={y(tick) + 4} textAnchor="end" fontSize="12" fill="#737373">
            {tick < 0 ? `−${axisLabel(-tick)}` : axisLabel(tick)}
          </text>
        </g>
      ))}
      <path d={area} fill={color} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={px} x2={px} y1={T} y2={T + ph} stroke="#a3a3a3" strokeDasharray="4 4" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === active ? 6 : 3.5}
          stroke={color}
          strokeWidth={2}
          fill={i === active ? color : "#ffffff"}
        />
      ))}
      {MONTHS.map((m, i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 10}
          textAnchor="middle"
          fontSize="12"
          fontWeight={i === active ? 600 : 400}
          fill={i === active ? "#171717" : "#737373"}
        >
          {m[0]}
        </text>
      ))}
      <g pointerEvents="none">
        <rect x={bx} y={by} width={boxW} height={72} rx={8} fill="#000000" />
        <text x={bx + 14} y={by + 24} fontSize="12" fill="#a3a3a3">
          {monthTitle(active)}
        </text>
        <text x={bx + 14} y={by + 46} fontSize="14" fontWeight={600} fill="#ededed">
          {money(values[active])} · {label}
        </text>
        <text x={bx + 14} y={by + 63} fontSize="10" fill="#a3a3a3">
          {formatCents(inCents[active])} in · {formatCents(outCents[active])} out
        </text>
      </g>
      {values.map((v, i) => (
        <rect
          key={i}
          x={x(i) - slot / 2}
          y={T}
          width={slot}
          height={ph + B - 4}
          fill="transparent"
          tabIndex={0}
          role="button"
          aria-label={`${monthTitle(i)}: ${money(v)} ${label}`}
          className="cursor-pointer outline-none focus-visible:stroke-neutral-900"
          onPointerEnter={() => onActive(i)}
          onClick={() => onActive(i)}
          onFocus={() => onActive(i)}
        />
      ))}
    </svg>
  );
}

const actionBtn =
  "relative flex min-h-[72px] flex-col justify-between rounded-xl border p-3 text-left text-sm font-semibold transition-colors";

export default function DashboardScreen({
  inCents,
  outCents,
  owed,
  owedCents,
  toCheck,
  onUpload,
  onSale,
  onExpense,
  onOwed,
}: {
  /** One figure per month, January to the demo's month. */
  inCents: number[];
  outCents: number[];
  /** Sales nobody has paid for, oldest first. */
  owed: OwedRow[];
  owedCents: number;
  toCheck: number;
  onUpload: () => void;
  onSale: () => void;
  onExpense: () => void;
  onOwed: () => void;
}) {
  const [series, setSeries] = useState<Series>("kept");
  const [active, setActive] = useState(inCents.length - 1);
  const kept = inCents.map((v, i) => v - outCents[i]);
  const values = series === "kept" ? kept : series === "in" ? inCents : outCents;
  const shown = owed.slice(0, 3);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[#525252]">Kept so far in 2026</span>
        <h1 className="text-[40px] font-bold leading-tight tracking-tight tabular-nums">{money(sum(kept))}</h1>
        <p className="text-sm tabular-nums">
          <span className="text-emerald-700">{formatCents(sum(inCents))} in</span>
          <span className="text-[#525252]"> · </span>
          <span className="text-red-700">{formatCents(sum(outCents))} out</span>
        </p>
      </div>

      <section className={`${card} flex flex-col gap-3 px-4 py-3.5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{SERIES[series].title}</h2>
          <Segmented
            ariaLabel="Show"
            value={series}
            onChange={setSeries}
            options={[
              { value: "kept", label: "Kept" },
              { value: "in", label: "In" },
              { value: "out", label: "Out" },
            ]}
          />
        </div>
        <MonthChart
          values={values}
          inCents={inCents}
          outCents={outCents}
          series={series}
          active={Math.min(active, values.length - 1)}
          onActive={setActive}
        />
      </section>

      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={onUpload}
          className={`${actionBtn} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`}
        >
          <span className="flex items-center justify-between">
            <Icon name="upload" className="h-[22px] w-[22px]" />
            {toCheck > 0 && (
              <>
                <span aria-hidden="true" className="rounded-full bg-amber-400 px-1.5 text-xs font-bold text-black tabular-nums">
                  {toCheck}
                </span>
                <span className="sr-only">
                  {toCheck} {toCheck === 1 ? "payment" : "payments"} to check.
                </span>
              </>
            )}
          </span>
          Upload
        </button>
        <button type="button" onClick={onSale} className={`${actionBtn} border-neutral-300 bg-white hover:bg-neutral-50`}>
          <Icon name="Log sale" className="h-[22px] w-[22px]" />
          Log sale
        </button>
        <button type="button" onClick={onExpense} className={`${actionBtn} border-neutral-300 bg-white hover:bg-neutral-50`}>
          <Icon name="Log expense" className="h-[22px] w-[22px]" />
          Log expense
        </button>
      </div>

      <section className={`${card} flex flex-col overflow-hidden`}>
        <div className="flex items-baseline justify-between bg-neutral-200 px-4 pb-3 pt-3.5">
          <h2 className="text-[15px] font-semibold">Total Owed to You</h2>
          <span className="text-[15px] font-semibold tabular-nums text-amber-800">{formatCents(owedCents)}</span>
        </div>
        {shown.length === 0 ? (
          <p className="border-t border-neutral-200 px-4 py-4 text-sm text-[#525252]">
            Nobody owes you anything. As it should be.
          </p>
        ) : (
          <ul className="flex flex-col">
            {shown.map((o) => {
              const days = daysBetween(o.date, DEMO_TODAY);
              return (
                <li key={o.id} className="border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={onOwed}
                    className="flex min-h-14 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-neutral-50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{o.name}</span>
                      <span className="text-[13px] text-[#525252]">
                        {days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`}
                      </span>
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums text-amber-800">{formatCents(o.cents)}</span>
                    <Icon name="next" className="h-4 w-4 text-[#737373]" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {owed.length > shown.length && (
          <button
            type="button"
            onClick={onOwed}
            className="min-h-11 border-t border-neutral-200 px-4 text-left text-sm font-semibold text-emerald-700 hover:bg-neutral-50"
          >
            See all {owed.length}
          </button>
        )}
      </section>
    </>
  );
}
