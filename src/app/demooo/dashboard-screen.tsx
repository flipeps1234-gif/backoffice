"use client";

import { useState } from "react";
import { formatCents } from "@/lib/transaction";
import { MONTHS, MONTH_NAMES } from "./data";
import { Icon, Segmented, card } from "./ui";

type Series = "kept" | "in" | "out";

const STEPS = [10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000];
export const axisLabel = (cents: number) =>
  cents === 0
    ? "$0"
    : cents >= 100000
      ? `$${(cents / 100000).toFixed(cents % 100000 ? 1 : 0)}k`
      : `$${cents / 100}`;
const sum = (a: number[]) => a.reduce((t, v) => t + v, 0);

function LineChart({
  values,
  color,
  label,
  title,
  inCents,
  outCents,
  active,
  onActive,
}: {
  values: number[];
  color: string;
  label: string;
  title: string;
  inCents: number[];
  outCents: number[];
  active: number;
  onActive: (i: number) => void;
}) {
  const W = 820;
  const H = 340;
  const L = 60;
  const R = 24;
  const T = 16;
  const B = 36;
  const pw = W - L - R;
  const ph = H - T - B;
  const peak = Math.max(...values, 1);
  const step = STEPS.find((s) => Math.ceil(peak / s) <= 7) ?? 500000;
  const yMax = Math.ceil(peak / step) * step;
  const x = (i: number) => L + (pw * i) / (values.length - 1);
  const y = (v: number) => T + ph - (v / yMax) * ph;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L${x(values.length - 1)} ${T + ph} L${x(0)} ${T + ph} Z`;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, k) => k * step);
  const slot = pw / (values.length - 1);
  // The callout sits beside the active point, flipped left past midway.
  const bx = active > values.length / 2 ? x(active) - 186 : x(active) + 16;
  const by = Math.min(Math.max(y(values[active]) - 84, T), T + ph - 76);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="group"
      aria-label={`${title}, January to September. ${MONTH_NAMES[active]}: ${formatCents(values[active])}.`}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e5e5" />
          <text x={L - 12} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#737373">
            {axisLabel(t)}
          </text>
        </g>
      ))}
      <path d={area} fill={color} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={x(active)} x2={x(active)} y1={T} y2={T + ph} stroke="#a3a3a3" strokeDasharray="4 4" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === active ? 6 : 3.5}
          fill={i === active ? color : "#ffffff"}
          stroke={color}
          strokeWidth={2}
        />
      ))}
      {MONTHS.map((m, i) => (
        <text
          key={m}
          x={x(i)}
          y={H - 10}
          textAnchor="middle"
          fontSize="12"
          fill={i === active ? "#171717" : "#737373"}
          fontWeight={i === active ? 600 : 400}
        >
          {m}
        </text>
      ))}
      <g pointerEvents="none">
        <rect x={bx} y={by} width={170} height={72} rx={8} fill="#000000" />
        <text x={bx + 14} y={by + 24} fontSize="12" fill="#a3a3a3">
          {MONTH_NAMES[active]}
          {active === values.length - 1 ? " so far" : ""}
        </text>
        <text x={bx + 14} y={by + 46} fontSize="16" fontWeight={600} fill="#ededed">
          {formatCents(values[active])} {label}
        </text>
        <text x={bx + 14} y={by + 63} fontSize="11" fill="#a3a3a3">
          {formatCents(inCents[active])} in · {formatCents(outCents[active])} out
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
          aria-label={`Show ${MONTH_NAMES[i]}`}
          onPointerEnter={() => onActive(i)}
          onFocus={() => onActive(i)}
          onClick={() => onActive(i)}
          className="cursor-pointer outline-none"
        />
      ))}
    </svg>
  );
}

export type ServiceTotal = { id: string; name: string; cents: number; jobs: number };

export default function DashboardScreen({
  inCents,
  outCents,
  owedCents,
  services,
  miles,
  visits,
  onOwed,
  onProof,
}: {
  inCents: number[];
  outCents: number[];
  owedCents: number;
  services: ServiceTotal[];
  miles: number;
  visits: number;
  onOwed: () => void;
  onProof: () => void;
}) {
  const [series, setSeries] = useState<Series>("kept");
  const [active, setActive] = useState(7);
  const [service, setService] = useState(0);

  const kept = inCents.map((v, i) => v - outCents[i]);
  const SERIES: Record<Series, { label: string; title: string; values: number[]; color: string }> = {
    kept: { label: "kept", title: "Kept, month by month", values: kept, color: "#059669" },
    in: { label: "in", title: "Money in, month by month", values: inCents, color: "#047857" },
    out: { label: "out", title: "Money out, month by month", values: outCents, color: "#ef4444" },
  };
  const s = SERIES[series];
  const sorted = [...services].sort((a, b) => b.cents - a.cents);
  const top = Math.max(sorted[0]?.cents ?? 1, 1);
  const picked = sorted[Math.min(service, sorted.length - 1)];

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-[#525252]">Kept so far in 2026</span>
          <h1 className="text-4xl font-semibold tracking-tight tabular-nums">{formatCents(sum(kept))}</h1>
          <span className="text-sm text-[#525252]">
            <span className="tabular-nums text-emerald-700">{formatCents(sum(inCents))} in</span>
            {" · "}
            <span className="tabular-nums text-red-600">{formatCents(sum(outCents))} out</span>
            {" · "}
            <button
              type="button"
              onClick={onOwed}
              className="tabular-nums text-amber-700 underline-offset-2 hover:underline"
            >
              {formatCents(owedCents)} still owed
            </button>
          </span>
        </div>
        <Segmented
          ariaLabel="Chart shows"
          value={series}
          onChange={setSeries}
          options={[
            { value: "kept", label: "Kept" },
            { value: "in", label: "In" },
            { value: "out", label: "Out" },
          ]}
        />
      </div>

      <section className={`${card} flex flex-col gap-3 px-5 py-5`}>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold">{s.title}</h2>
          <span className="text-xs text-[#737373]">
            Point at a month · {formatCents(sum(s.values))} total
          </span>
        </div>
        <LineChart
          values={s.values}
          color={s.color}
          label={s.label}
          title={s.title}
          inCents={inCents}
          outCents={outCents}
          active={active}
          onActive={setActive}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${card} flex flex-col gap-4 p-5 lg:col-span-2`}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold">Revenue by service</h2>
            {picked && (
              <span className="text-xs tabular-nums text-[#737373]">
                {picked.name} · {picked.jobs} jobs · avg {formatCents(Math.round(picked.cents / Math.max(picked.jobs, 1)))}
              </span>
            )}
          </div>
          <div className="flex h-48 items-stretch gap-3.5">
            {sorted.map((sv, i) => (
              <button
                key={sv.id}
                type="button"
                aria-pressed={service === i}
                onClick={() => setService(i)}
                onPointerEnter={() => setService(i)}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-md"
              >
                <span className="text-sm font-semibold tabular-nums">{axisLabel(sv.cents)}</span>
                <span
                  className={`w-full rounded-t-md transition-colors ${service === i ? "bg-emerald-600" : "bg-emerald-300"}`}
                  style={{ height: `${Math.max(4, Math.round((sv.cents / top) * 120))}px` }}
                />
                <span className="w-full truncate text-center text-xs text-[#525252]">{sv.name}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className={`${card} flex flex-col gap-3 p-5`}>
            <div className="flex items-center gap-2.5 text-[#525252]">
              <Icon name="car" />
              <h2 className="text-sm font-semibold text-neutral-900">Mileage (estimate)</h2>
            </div>
            <span className="text-3xl font-semibold tabular-nums">{miles.toLocaleString("en-US")} mi</span>
            <span className="text-xs text-[#737373]">{visits} visits, round trip in 2026</span>
          </section>
          <section className={`${card} flex flex-col gap-3 p-5`}>
            <div className="flex items-center gap-2.5 text-[#525252]">
              <Icon name="file" />
              <h2 className="text-sm font-semibold text-neutral-900">Proof of income</h2>
            </div>
            <button
              type="button"
              onClick={onProof}
              className="flex h-11 items-center justify-center rounded-lg bg-emerald-600 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Print or save as PDF
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
