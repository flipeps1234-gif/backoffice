"use client";

import { useState, type ReactNode } from "react";
import Mark from "../mark";
import { formatCents } from "@/lib/transaction";

/* Sample data for one made-up cleaning business, integer cents like the
   ledger. Kept = in − out, month by month. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
];
const IN = [421000, 388000, 514000, 562000, 631000, 698000, 745000, 672000, 519000];
const OUT = [91000, 76000, 123000, 104000, 138000, 151000, 129000, 142000, 98000];
const KEPT = IN.map((v, i) => v - OUT[i]);
const sum = (a: number[]) => a.reduce((t, v) => t + v, 0);
const OWED_CENTS = 134000;

const SERVICES = [
  { name: "Full-house cleaning", cents: 2460000, jobs: 205 },
  { name: "Deep clean", cents: 1320000, jobs: 60 },
  { name: "Move-out clean", cents: 910000, jobs: 35 },
  { name: "Windows", cents: 460000, jobs: 46 },
];

type Series = "kept" | "in" | "out";
const SERIES: Record<Series, { label: string; title: string; values: number[]; color: string }> = {
  kept: { label: "Kept", title: "Kept, month by month", values: KEPT, color: "#059669" },
  in: { label: "In", title: "Money in, month by month", values: IN, color: "#047857" },
  out: { label: "Out", title: "Money out, month by month", values: OUT, color: "#ef4444" },
};

type Section =
  | "Dashboard"
  | "Snap a receipt"
  | "New sale"
  | "Log an expense"
  | "Owed"
  | "Clients"
  | "Products & services"
  | "History"
  | "Settings"
  | "Proof of income";

const ICONS: Record<string, ReactNode> = {
  Dashboard: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  "Snap a receipt": (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  "New sale": <path d="M12 5v14M5 12h14" />,
  "Log an expense": (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  Owed: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  Clients: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3 3 3 6" />
    </>
  ),
  "Products & services": (
    <>
      <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  History: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  Settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  car: (
    <>
      <path d="M4 16v-4l2-5h12l2 5v4z" />
      <path d="M4 16v2M20 16v2" />
      <circle cx="8" cy="13.5" r="1" />
      <circle cx="16" cy="13.5" r="1" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
};

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`flex-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const NAV: Section[] = [
  "Dashboard",
  "Snap a receipt",
  "New sale",
  "Log an expense",
  "Owed",
  "Clients",
  "Products & services",
  "History",
];

/* ---------- the line chart ---------- */

const STEPS = [10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000];
const axisLabel = (cents: number) =>
  cents === 0
    ? "$0"
    : cents >= 100000
      ? `$${(cents / 100000).toFixed(cents % 100000 ? 1 : 0)}k`
      : `$${cents / 100}`;

function LineChart({
  series,
  active,
  onActive,
}: {
  series: Series;
  active: number;
  onActive: (i: number) => void;
}) {
  const { values, color, label } = SERIES[series];
  const W = 820;
  const H = 340;
  const L = 60;
  const R = 24;
  const T = 16;
  const B = 36;
  const pw = W - L - R;
  const ph = H - T - B;
  const peak = Math.max(...values);
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
      aria-label={`${SERIES[series].title}, January to September. ${MONTH_NAMES[active]}: ${formatCents(values[active])}.`}
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
      <line
        x1={x(active)}
        x2={x(active)}
        y1={T}
        y2={T + ph}
        stroke="#a3a3a3"
        strokeDasharray="4 4"
      />
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
        </text>
        <text x={bx + 14} y={by + 46} fontSize="16" fontWeight={600} fill="#ededed">
          {formatCents(values[active])} {label.toLowerCase()}
        </text>
        <text x={bx + 14} y={by + 63} fontSize="11" fill="#a3a3a3">
          {formatCents(IN[active])} in · {formatCents(OUT[active])} out
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

/* ---------- the page ---------- */

export default function DemoDashboard() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [series, setSeries] = useState<Series>("kept");
  const [active, setActive] = useState(7);
  const [service, setService] = useState(0);

  const card = "rounded-xl border border-neutral-300 bg-white";
  const topService = SERVICES[0].cents;

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-200 text-neutral-900 lg:flex-row">
      {/* Sidebar — black, like the website's top banner */}
      <nav
        aria-label="Main"
        className="flex flex-none flex-col gap-4 bg-black px-3 py-4 text-[#ededed] [--background:#000] lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:gap-6 lg:px-3.5 lg:py-6"
      >
        <div className="flex items-center gap-2.5 px-2.5">
          <Mark className="h-[26px] w-[26px]" />
          <span className="text-xl font-semibold tracking-tight">contado</span>
          <span className="ml-auto rounded-full border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300">
            Demo
          </span>
        </div>
        <ul className="-mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
          {NAV.map((item) => {
            const on = section === item;
            return (
              <li key={item} className="flex-none">
                <button
                  type="button"
                  onClick={() => setSection(item)}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm transition-colors ${
                    on
                      ? "bg-[#ededed] font-semibold text-black"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-[#ededed]"
                  }`}
                >
                  <Icon name={item} />
                  <span className="flex-1 text-left">{item}</span>
                  {item === "Owed" && (
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto hidden flex-col gap-1 lg:flex">
          <a
            href="/app"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#ededed] text-sm font-semibold text-black transition-colors hover:bg-white"
          >
            <Icon name="upload" />
            Upload screenshots
          </a>
          <button
            type="button"
            onClick={() => setSection("Settings")}
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-[#ededed]"
          >
            <Icon name="Settings" />
            Settings
          </button>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-4 py-6 lg:px-9 lg:py-7">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This is a demo of the desktop dashboard we&rsquo;re building. Every number is sample
          data for a made-up cleaning business.
        </p>

        {section !== "Dashboard" ? (
          <section className={`${card} flex flex-col items-start gap-3 p-6`}>
            <h1 className="text-2xl font-semibold tracking-tight">{section}</h1>
            <p className="text-sm text-[#525252]">
              This demo only shows the dashboard. {section} works today in the app.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/app"
                className="flex h-11 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Open the app
              </a>
              <button
                type="button"
                onClick={() => setSection("Dashboard")}
                className="h-11 rounded-lg border border-neutral-300 px-4 text-sm transition-colors hover:bg-neutral-100"
              >
                Back to the dashboard
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wide text-[#525252]">
                  Kept so far in 2026
                </span>
                <h1 className="text-4xl font-semibold tracking-tight tabular-nums">
                  {formatCents(sum(KEPT))}
                </h1>
                <span className="text-sm text-[#525252]">
                  <span className="tabular-nums text-emerald-700">{formatCents(sum(IN))} in</span>
                  {" · "}
                  <span className="tabular-nums text-red-600">{formatCents(sum(OUT))} out</span>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setSection("Owed")}
                    className="tabular-nums text-amber-700 underline-offset-2 hover:underline"
                  >
                    {formatCents(OWED_CENTS)} still owed
                  </button>
                </span>
              </div>
              <div
                role="group"
                aria-label="Chart shows"
                className="flex gap-1 rounded-full border border-neutral-300 bg-white p-1"
              >
                {(Object.keys(SERIES) as Series[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={series === s}
                    onClick={() => setSeries(s)}
                    className={`h-8 rounded-full px-3.5 text-sm transition-colors ${
                      series === s ? "bg-neutral-900 text-white" : "text-[#525252] hover:bg-neutral-100"
                    }`}
                  >
                    {SERIES[s].label}
                  </button>
                ))}
              </div>
            </div>

            <section className={`${card} flex flex-col gap-3 px-5 py-5`}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-semibold">{SERIES[series].title}</h2>
                <span className="text-xs text-[#737373]">
                  Point at a month · {formatCents(sum(SERIES[series].values))} total
                </span>
              </div>
              <LineChart series={series} active={active} onActive={setActive} />
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className={`${card} flex flex-col gap-4 p-5 lg:col-span-2`}>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-base font-semibold">Revenue by service</h2>
                  <span className="text-xs tabular-nums text-[#737373]">
                    {SERVICES[service].jobs} jobs · avg{" "}
                    {formatCents(Math.round(SERVICES[service].cents / SERVICES[service].jobs))}
                  </span>
                </div>
                <div className="flex h-48 items-stretch gap-3.5">
                  {SERVICES.map((s, i) => (
                    <button
                      key={s.name}
                      type="button"
                      aria-pressed={service === i}
                      onClick={() => setService(i)}
                      onPointerEnter={() => setService(i)}
                      className="flex flex-1 flex-col items-center justify-end gap-2 rounded-md"
                    >
                      <span className="text-sm font-semibold tabular-nums">
                        {axisLabel(s.cents)}
                      </span>
                      <span
                        className={`w-full rounded-t-md transition-colors ${
                          service === i ? "bg-emerald-600" : "bg-emerald-300"
                        }`}
                        style={{ height: `${Math.round((s.cents / topService) * 120)}px` }}
                      />
                      <span className="text-center text-xs text-[#525252]">{s.name}</span>
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
                  <span className="text-3xl font-semibold tabular-nums">1,860 mi</span>
                  <span className="text-xs text-[#737373]">142 visits, round trip in 2026</span>
                </section>
                <section className={`${card} flex flex-col gap-3 p-5`}>
                  <div className="flex items-center gap-2.5 text-[#525252]">
                    <Icon name="file" />
                    <h2 className="text-sm font-semibold text-neutral-900">Proof of income</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection("Proof of income")}
                    className="flex h-11 items-center justify-center rounded-lg bg-emerald-600 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    Print or save as PDF
                  </button>
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
