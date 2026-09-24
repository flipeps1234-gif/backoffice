"use client";

import { useState } from "react";
import { formatCents } from "@/lib/transaction";
import { DEMO_TODAY, daysBetween, shortDate, type Client, type Entry, type Sale } from "./data";
import { AgeChip, Icon, ScreenHeader, card, input, label, primaryBtn, smallBtn } from "./ui";

type Row = { id: string; date: string; label: string; cents: number; status: string; tone: string };

function NotesEditor({ client, onSave }: { client: Client; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(client.notes);
  const dirty = notes !== client.notes;
  return (
    <label className="flex flex-col gap-1.5">
      <span className={label}>Notes</span>
      <textarea
        className={`${input} min-h-20`}
        placeholder="Gate code, dog’s name, prefers Tuesdays…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {dirty && (
        <button type="button" className={`${smallBtn} self-start`} onClick={() => onSave(notes)}>
          Save notes
        </button>
      )}
    </label>
  );
}

export default function ClientsScreen({
  clients,
  entries,
  sales,
  selectedId,
  onSelect,
  onLogSale,
  onNotes,
}: {
  clients: Client[];
  entries: Entry[];
  sales: Sale[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLogSale: (clientId: string) => void;
  onNotes: (id: string, notes: string) => void;
}) {
  const [query, setQuery] = useState("");

  const paid = (c: Client) =>
    c.basePaidCents +
    entries.filter((e) => e.dir === "in" && e.clientId === c.id).reduce((t, e) => t + e.cents, 0);
  const owes = (c: Client) =>
    sales.filter((s) => s.status === "owed" && s.clientId === c.id).reduce((t, s) => t + s.totalCents, 0);

  const shown = clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const client = clients.find((c) => c.id === selectedId) ?? clients[0];

  const rows: Row[] = client
    ? [
        ...entries
          .filter((e) => e.dir === "in" && e.clientId === client.id)
          .map((e) => ({
            id: e.id,
            date: e.date,
            label: e.what,
            cents: e.cents,
            status: e.source === "cash" ? "paid cash" : "paid",
            tone: "text-emerald-700",
          })),
        ...sales
          .filter((s) => s.clientId === client.id && s.status !== "cash")
          .map((s) => ({
            id: s.id,
            date: s.date,
            label: s.lines.map((l) => l.label).join(", "),
            cents: s.totalCents,
            status: s.status === "owed" ? "owes you" : "paid, waiting to match",
            tone: s.status === "owed" ? "text-amber-700" : "text-[#525252]",
          })),
      ].sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const oldestOwed = client
    ? sales
        .filter((s) => s.status === "owed" && s.clientId === client.id)
        .sort((a, b) => a.date.localeCompare(b.date))[0]
    : undefined;

  return (
    <>
      <ScreenHeader title="Clients" sub={`${clients.length} clients`} />
      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className={`${card} flex flex-col overflow-hidden`}>
          <div className="border-b border-neutral-200 p-3">
            <label className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 focus-within:border-neutral-900">
              <Icon name="search" className="h-4 w-4 text-[#737373]" />
              <input
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-[#a3a3a3]"
                placeholder="Search clients"
                aria-label="Search clients"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <ul className="flex max-h-[640px] flex-col divide-y divide-neutral-200 overflow-y-auto">
            {shown.length === 0 && <li className="p-4 text-sm text-[#737373]">No clients match.</li>}
            {shown.map((c) => {
              const o = owes(c);
              const on = client?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-current={on ? "true" : undefined}
                    onClick={() => onSelect(c.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      on ? "bg-emerald-600/10" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                      {c.name
                        .split(" ")
                        .filter(Boolean)
                        .map((w) => w[0].toUpperCase())
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{c.name}</span>
                      <span className="truncate text-xs text-[#737373]">{c.recurring ?? "One-off jobs"}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="text-sm tabular-nums">{formatCents(paid(c))}</span>
                      {o > 0 && <span className="text-xs tabular-nums text-amber-700">owes {formatCents(o)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {client && (
          <section className={`${card} flex flex-col gap-5 p-6`}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-2xl font-semibold tracking-tight">{client.name}</h2>
                <span className="text-sm text-[#737373]">{client.recurring ?? "No recurring sale"}</span>
              </div>
              <button type="button" className={primaryBtn} onClick={() => onLogSale(client.id)}>
                <Icon name="plus" />
                Log a sale for {client.name.split(" ")[0]}
              </button>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="text-xs text-[#737373]">Paid in 2026</span>
                <p className="text-xl font-semibold tabular-nums text-emerald-700">{formatCents(paid(client))}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="text-xs text-[#737373]">Owes</span>
                <p className="flex flex-wrap items-center gap-2 text-xl font-semibold tabular-nums text-amber-700">
                  {formatCents(owes(client))}
                  {oldestOwed && <AgeChip days={daysBetween(oldestOwed.date, DEMO_TODAY)} />}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="text-xs text-[#737373]">Distance, round trip</span>
                <p className="text-xl font-semibold tabular-nums">{client.miles ? `${client.miles} mi` : "—"}</p>
              </div>
            </div>

            <NotesEditor key={client.id} client={client} onSave={(n) => onNotes(client.id, n)} />

            <div className="flex flex-col">
              <h3 className="pb-2 text-sm font-semibold">History</h3>
              {rows.length === 0 ? (
                <p className="text-sm text-[#737373]">
                  No sales this month. Earlier months are in the totals above.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">{r.label}</span>
                        <span className="text-xs text-[#737373]">{shortDate(r.date)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold tabular-nums">{formatCents(r.cents)}</span>
                        <span className={`text-xs ${r.tone}`}>{r.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
