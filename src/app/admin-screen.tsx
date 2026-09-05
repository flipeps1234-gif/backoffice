"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DB_CEILING_BYTES,
  barScale,
  bytesLabel,
  daysAgoLabel,
  languageLabel,
  parseOverview,
  percentOf,
  sampleOverview,
  sparklinePoints,
  type AccountRow,
  type Overview,
} from "@/lib/admin/overview";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/use-session";
import { formatCents } from "@/lib/transaction";

/**
 * The owner's analytics screen. English only on purpose: this is the
 * owner's tooling behind OWNER_EMAILS, not a user surface, so it stays out
 * of the trilingual dictionary the app ships to everyone.
 *
 * Palette and type follow design-tokens.md exactly — neutral, emerald,
 * amber, red; kickers in the app's own kicker style; money tabular in $.
 * The charts are inline SVG in currentColor: no library, no new colors.
 */

type State =
  | { kind: "idle" }
  | { kind: "signed-out" }
  | { kind: "dark" }
  | { kind: "forbidden" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; data: Overview; fetchedAt: Date };

type SortKey = "lastActivityAt" | "createdAt" | "moneyInCents" | "transactions" | "owedCents";

/** Resolves to the screen's next state; never throws, never touches React. */
async function fetchOverview(sample: boolean): Promise<State> {
  if (sample) {
    const now = new Date();
    return { kind: "ready", data: sampleOverview(now), fetchedAt: now };
  }
  const supabase = getSupabase();
  if (!supabase) return { kind: "dark" };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { kind: "signed-out" };
  try {
    const response = await fetch("/api/admin/overview", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 401) return { kind: "signed-out" };
    if (response.status === 403) return { kind: "forbidden" };
    if (response.status === 503) return { kind: "dark" };
    if (!response.ok) return { kind: "error", detail: `HTTP ${response.status}` };
    return { kind: "ready", data: parseOverview(await response.json()), fetchedAt: new Date() };
  } catch {
    return { kind: "error", detail: "The request never reached the server." };
  }
}

export default function AdminScreen() {
  const { user, loading } = useSession();
  // Development only: ?sample=1 renders a fake payload so the layout can be
  // checked without a service key or real accounts (page.tsx wraps this
  // screen in Suspense for the search-params read).
  const params = useSearchParams();
  const sample = process.env.NODE_ENV !== "production" && params.get("sample") === "1";
  const [state, setState] = useState<State>({ kind: "idle" });
  const [sortKey, setSortKey] = useState<SortKey>("lastActivityAt");
  const [showTester, setShowTester] = useState(false);


  // The fetch lives outside the component and RETURNS the next state; the
  // only setState runs inside .then — never synchronously in the effect
  // (the repo's hooks rule), and never after this render was replaced.
  useEffect(() => {
    if (loading || (!user && !sample)) return;
    let stale = false;
    fetchOverview(sample).then((next) => {
      if (!stale) setState(next);
    });
    return () => {
      stale = true;
    };
  }, [user, loading, sample]);
  const refresh = useCallback(() => {
    setState({ kind: "idle" });
    fetchOverview(sample).then(setState);
  }, [sample]);

  const signedOut = !loading && !user && !sample;
  if (!signedOut && (loading || state.kind === "idle")) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  if (signedOut || state.kind === "signed-out") {
    return (
      <Note>
        Sign in to the app first, with the owner&apos;s email — then come back to{" "}
        <code>/app/admin</code>.{" "}
        <a href="/app" className="underline">Open the app</a>
      </Note>
    );
  }
  if (state.kind === "dark") {
    return (
      <Note>
        This page is dark until <code>OWNER_EMAILS</code> (the sign-in address allowed to see
        it) and the server key are set in Vercel&apos;s Production environment — see DEPLOY.md.
      </Note>
    );
  }
  if (state.kind === "forbidden") {
    return <Note>This page is for the owner&apos;s account only.</Note>;
  }
  if (state.kind === "error") {
    return (
      <Note>
        Couldn&apos;t load the numbers ({state.detail}).{" "}
        <button type="button" onClick={refresh} className="underline">
          Try again
        </button>
      </Note>
    );
  }

  if (state.kind !== "ready") {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  return <Overview data={state.data} fetchedAt={state.fetchedAt} onRefresh={refresh} sortKey={sortKey} onSort={setSortKey} showTester={showTester} onToggleTester={() => setShowTester((v) => !v)} />;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
      {children}
    </p>
  );
}

function Overview({
  data,
  fetchedAt,
  onRefresh,
  sortKey,
  onSort,
  showTester,
  onToggleTester,
}: {
  data: Overview;
  fetchedAt: Date;
  onRefresh: () => void;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  showTester: boolean;
  onToggleTester: () => void;
}) {
  const t = data.totals;
  const rows = useMemo(() => {
    const visible = data.accounts.filter((a) => showTester || !a.isTester);
    const value = (a: AccountRow): number | string =>
      sortKey === "lastActivityAt"
        ? a.lastActivityAt ?? a.lastSignInAt ?? ""
        : sortKey === "createdAt"
          ? a.createdAt
          : a[sortKey];
    return [...visible].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      return va < vb ? 1 : va > vb ? -1 : 0;
    });
  }, [data.accounts, sortKey, showTester]);

  const weeklyMoney = data.weekly.map((w) => w.moneyInCents);
  const weeklyAccounts = data.weekly.map((w) => w.newAccounts);
  const uploadBars = barScale(data.dailyUploads.map((d) => d.images));
  const dbPct = percentOf(data.storage.dbBytes, DB_CEILING_BYTES);
  const netCents = t.moneyInCents - t.moneyOutCents;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Analytics</h2>
          <p className="text-sm text-neutral-500">
            Every account except the shared demo. Money is what your users logged, not revenue to you.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="text-sm text-neutral-500 hover:underline"
          title={`Fetched ${fetchedAt.toLocaleTimeString()}`}
        >
          Refresh
        </button>
      </div>

      {/* Headline tiles — the Owed big-number style, one per fact. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Accounts" value={String(t.accounts)} note={`${t.new30d} new in 30 days`} />
        <Tile label="Active" value={String(t.active7d)} note={`last 7 days · ${t.active30d} in 30`} />
        <Tile label="Money in logged" value={formatCents(t.moneyInCents)} tone="emerald" note="business income, all books" />
        <Tile label="Money out logged" value={formatCents(t.moneyOutCents)} tone="red" note={`net ${formatCents(netCents)}`} />
        <Tile label="Owed across books" value={formatCents(t.owedCents)} tone="amber" note={`${t.salesOpen} open sales`} />
        <Tile label="Payments" value={String(t.transactions)} note={`${t.transactionsScreenshot} from screenshots · ${t.transactionsManual} typed`} />
        <Tile label="Sales" value={String(t.sales)} note={`${t.salesPaid} paid · ${t.salesExpected} expected · ${t.salesOpen} open`} />
        <Tile label="Uploads, 30 days" value={String(t.uploads30d)} note={`${t.images30d} images · demo used ${t.demoImages30d}`} />
      </section>

      {/* Trends — two 12-week lines and a 30-day column chart. */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Money in per week" sub="last 12 weeks">
          <Sparkline values={weeklyMoney} className="text-emerald-600" />
          <Legend first={data.weekly[0]?.week} last={data.weekly.at(-1)?.week} />
        </Card>
        <Card title="New accounts per week" sub="last 12 weeks">
          <Sparkline values={weeklyAccounts} className="text-foreground" />
          <Legend first={data.weekly[0]?.week} last={data.weekly.at(-1)?.week} />
        </Card>
        <Card title="Images extracted per day" sub="last 30 days, demo included">
          <div className="flex h-16 items-end gap-px" aria-hidden="true">
            {uploadBars.map((h, i) => (
              <div
                key={data.dailyUploads[i]?.day ?? i}
                className="flex-1 rounded-t-sm bg-neutral-300 dark:bg-neutral-700"
                style={{ height: `${Math.max(2, h * 100)}%` }}
                title={`${data.dailyUploads[i]?.day}: ${data.dailyUploads[i]?.images} images in ${data.dailyUploads[i]?.uploads} uploads`}
              />
            ))}
          </div>
          <Legend first={data.dailyUploads[0]?.day} last={data.dailyUploads.at(-1)?.day} />
        </Card>
      </section>

      {/* Smaller facts, one row of chips. */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Reach" sub="what the product has captured">
          <Facts
            rows={[
              ["Clients in all books", String(t.clients)],
              ["Active recurring templates", String(t.recurringActive)],
              ["Business profiles filled in", `${t.profiles} of ${t.accounts}`],
              ["Founding-hundred signups", String(t.foundingSignups)],
              ["Deletions pending", String(t.deletionPending)],
            ]}
          />
        </Card>
        <Card title="Languages" sub="what the inbox speaks">
          <Facts rows={data.languages.map((l) => [languageLabel(l.lang), String(l.accounts)])} />
          {data.languages.length === 0 && <p className="text-sm text-neutral-500">No accounts yet.</p>}
        </Card>
        <Card title="Storage" sub={`${bytesLabel(data.storage.dbBytes)} of the 500 MB free tier`}>
          <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true">
            <div
              className={`h-2 rounded-full ${dbPct > 80 ? "bg-red-500" : dbPct > 50 ? "bg-amber-500" : "bg-emerald-600"}`}
              style={{ width: `${Math.max(1, dbPct)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">{dbPct.toFixed(1)}% used</p>
          <Facts rows={data.storage.tables.slice(0, 5).map((row) => [row.name, bytesLabel(row.bytes)])} />
        </Card>
      </section>

      {/* The account list. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Accounts · {rows.length}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span>Sort by</span>
            {(
              [
                ["lastActivityAt", "last active"],
                ["createdAt", "newest"],
                ["moneyInCents", "money in"],
                ["transactions", "payments"],
                ["owedCents", "owed"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onSort(key)}
                className={`rounded-full px-2 py-0.5 ${sortKey === key ? "bg-foreground text-background" : "hover:bg-neutral-100 dark:hover:bg-neutral-900"}`}
              >
                {label}
              </button>
            ))}
            <label className="ml-2 inline-flex items-center gap-1">
              <input type="checkbox" checked={showTester} onChange={onToggleTester} />
              show demo account
            </label>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Last active</th>
                <th className="px-3 py-2 text-right font-medium">Payments</th>
                <th className="px-3 py-2 text-right font-medium">Sales</th>
                <th className="px-3 py-2 text-right font-medium">Clients</th>
                <th className="px-3 py-2 text-right font-medium">Money in</th>
                <th className="px-3 py-2 text-right font-medium">Owed</th>
                <th className="px-3 py-2 text-right font-medium">Uploads 30d</th>
                <th className="px-3 py-2 font-medium">Lang</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-neutral-200 last:border-0 dark:border-neutral-800">
                  <td className="px-3 py-2">
                    <div className="truncate" title={a.id}>{a.email ?? "—"}</div>
                    <div className="flex gap-1 text-xs">
                      {a.isTester && <Chip tone="amber">demo</Chip>}
                      {a.deletionRequestedAt && <Chip tone="red">deleting</Chip>}
                      {a.hasProfile && <Chip tone="neutral">profile</Chip>}
                      {a.recurringActive > 0 && <Chip tone="neutral">{a.recurringActive} recurring</Chip>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{a.createdAt.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-neutral-500">{daysAgoLabel(a.lastActivityAt ?? a.lastSignInAt, fetchedAt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.transactions}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.sales}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.clients}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{formatCents(a.moneyInCents)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${a.owedCents > 0 ? "text-amber-700 dark:text-amber-400" : "text-neutral-500"}`}>{formatCents(a.owedCents)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.uploads30d}</td>
                  <td className="px-3 py-2 text-neutral-500">{a.lang}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-neutral-500">No accounts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-neutral-500">
        Generated {new Date(data.generatedAt).toLocaleString()} · totals exclude the shared demo account · a sale&apos;s
        total is the sum of its lines · owed = open sales (expected counts as received, the app&apos;s law).
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "emerald" | "amber" | "red";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : tone === "red"
          ? "text-red-500"
          : "";
  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {note && <div className="mt-1 text-xs text-neutral-500">{note}</div>}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-3">
        <div className="text-base font-semibold">{title}</div>
        {sub && <div className="text-xs text-neutral-500">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3">
          <dt className="text-neutral-500">{k}</dt>
          <dd className="tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chip({ tone, children }: { tone: "amber" | "red" | "neutral"; children: React.ReactNode }) {
  const cls =
    tone === "amber"
      ? "bg-amber-50 text-amber-900 ring-amber-200"
      : tone === "red"
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700";
  return <span className={`rounded-full px-1.5 py-px ring-1 ${cls}`}>{children}</span>;
}

function Sparkline({ values, className }: { values: number[]; className: string }) {
  const width = 240;
  const height = 64;
  const points = sparklinePoints(values, width, height);
  const max = Math.max(...values, 0);
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className={`h-16 w-full ${className}`} aria-hidden="true">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="text-xs text-neutral-500">
        peak {className.includes("emerald") ? formatCents(max) : max} · latest{" "}
        {className.includes("emerald") ? formatCents(values.at(-1) ?? 0) : (values.at(-1) ?? 0)}
      </div>
    </div>
  );
}

function Legend({ first, last }: { first?: string; last?: string }) {
  return (
    <div className="mt-1 flex justify-between text-xs text-neutral-500">
      <span>{first ?? ""}</span>
      <span>{last ?? ""}</span>
    </div>
  );
}
