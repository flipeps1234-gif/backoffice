"use client";

import { useState } from "react";
import { formatCents } from "@/lib/transaction";
import { dayLabel, type Entry } from "./data";
import { Icon, ScreenHeader, Segmented, card } from "./ui";

type Filter = "all" | "in" | "out";

export default function HistoryScreen({ entries }: { entries: Entry[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = entries
    .filter((e) => filter === "all" || e.dir === filter)
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.what.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const inTotal = shown.filter((e) => e.dir === "in" && e.business).reduce((t, e) => t + e.cents, 0);
  const outTotal = shown.filter((e) => e.dir === "out" && e.business).reduce((t, e) => t + e.cents, 0);

  const days: { date: string; items: Entry[] }[] = [];
  for (const e of shown) {
    const last = days.at(-1);
    if (last && last.date === e.date) last.items.push(e);
    else days.push({ date: e.date, items: [e] });
  }

  return (
    <>
      <ScreenHeader
        title="History"
        sub={
          <>
            September 2026 ·{" "}
            <span className="tabular-nums text-emerald-700">{formatCents(inTotal)} in</span> ·{" "}
            <span className="tabular-nums text-red-600">{formatCents(outTotal)} out</span>
          </>
        }
      >
        <label className="flex h-10 w-64 items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 focus-within:border-neutral-900">
          <Icon name="search" className="h-4 w-4 text-[#737373]" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#a3a3a3]"
            placeholder="Search names or services"
            aria-label="Search history"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Segmented
          ariaLabel="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "in", label: "Money in" },
            { value: "out", label: "Money out" },
          ]}
        />
      </ScreenHeader>

      {days.length === 0 ? (
        <p className={`${card} p-6 text-sm text-[#737373]`}>Nothing matches.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((d) => {
            const net = d.items
              .filter((e) => e.business)
              .reduce((t, e) => t + (e.dir === "in" ? e.cents : -e.cents), 0);
            return (
              <section key={d.date} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold text-[#404040]">{dayLabel(d.date)}</h2>
                  <span className={`text-xs tabular-nums ${net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {net >= 0 ? "+" : "−"}
                    {formatCents(Math.abs(net))}
                  </span>
                </div>
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-300 bg-white">
                  {d.items.map((e) => (
                    <li key={e.id} className="flex items-center gap-4 px-4 py-3">
                      <span
                        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${
                          e.dir === "in" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                        }`}
                        aria-hidden="true"
                      >
                        <Icon name={e.dir === "in" ? "plus" : "minus"} className="h-4 w-4" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{e.name}</span>
                        <span className="truncate text-xs text-[#737373]">{e.what}</span>
                      </div>
                      <div className="hidden gap-1.5 sm:flex">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-[#525252] ring-1 ring-neutral-200">
                          {e.source === "cash" ? "Cash" : "Screenshot"}
                        </span>
                        {!e.business && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-[#525252] ring-1 ring-neutral-200">
                            Personal
                          </span>
                        )}
                      </div>
                      <span
                        className={`w-28 text-right text-sm font-semibold tabular-nums ${
                          e.dir === "in" ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {e.dir === "in" ? "+" : "−"}
                        {formatCents(e.cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
