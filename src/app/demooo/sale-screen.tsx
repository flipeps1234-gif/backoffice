"use client";

import { useState } from "react";
import { dollarsToCents, formatCents } from "@/lib/transaction";
import { DEMO_TODAY, UNIT_LABEL, type Client, type Product, type SaleLine } from "./data";
import { Icon, ScreenHeader, card, input, label, primaryBtn } from "./ui";

export type Paid = "cash" | "waiting" | "owed";

export type SaleDraft = {
  clientId: string | null;
  newClientName: string | null;
  lines: SaleLine[];
  date: string;
  paid: Paid;
};

const UNIT_WORD: Record<Product["unit"], string> = { flat: "", hour: "hours", room: "rooms", sqft: "sq ft" };

export default function SaleScreen({
  clients,
  products,
  initialClientId,
  onSave,
}: {
  clients: Client[];
  products: Product[];
  initialClientId: string | null;
  onSave: (draft: SaleDraft) => void;
}) {
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [typed, setTyped] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [customAmount, setCustomAmount] = useState("");
  const [customFor, setCustomFor] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);
  const [paid, setPaid] = useState<Paid | null>(null);

  const typedMatch = clients.find((c) => c.name.toLowerCase() === typed.trim().toLowerCase());
  const effectiveClient = clientId
    ? clients.find((c) => c.id === clientId) ?? null
    : typedMatch ?? null;
  const newName = !clientId && !typedMatch && typed.trim() ? typed.trim() : null;
  const hasClient = Boolean(effectiveClient || newName);

  const lines: SaleLine[] = products
    .filter((p) => (qty[p.id] ?? 0) > 0)
    .map((p) => ({ productId: p.id, label: p.name, qty: qty[p.id], cents: p.priceCents * qty[p.id] }));
  const custom = dollarsToCents(customAmount);
  if (custom > 0) lines.push({ productId: null, label: customFor.trim() || "Custom amount", qty: 1, cents: custom });
  const total = lines.reduce((t, l) => t + l.cents, 0);

  const digitalBlocked = paid === "waiting" && !hasClient;
  const canSave = total > 0 && paid !== null && !digitalBlocked;

  const bump = (id: string, d: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + d) }));

  function reset() {
    setClientId(null);
    setTyped("");
    setQty({});
    setCustomAmount("");
    setCustomFor("");
    setDate(DEMO_TODAY);
    setPaid(null);
  }

  function save() {
    if (!canSave || paid === null) return;
    onSave({
      clientId: effectiveClient?.id ?? null,
      newClientName: newName,
      lines,
      date,
      paid,
    });
    reset();
  }

  const recent = clients.slice(0, 8);

  return (
    <>
      <ScreenHeader title="Log sale" sub="A job you did, whether they’ve paid yet or not." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <section className={`${card} flex flex-col gap-3 p-5`}>
            <h2 className="text-base font-semibold">Who’s it for?</h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={clientId === c.id}
                  onClick={() => {
                    setClientId(clientId === c.id ? null : c.id);
                    setTyped("");
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm ring-1 transition-colors ${
                    clientId === c.id
                      ? "bg-emerald-50 font-medium text-emerald-800 ring-emerald-600"
                      : "bg-white text-[#404040] ring-neutral-300 hover:bg-neutral-100"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Or type a name</span>
              <input
                className={input}
                placeholder="Client name"
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setClientId(null);
                }}
              />
            </label>
            {newName && (
              <p className="text-sm text-[#525252]">
                “{newName}” will be saved as a new client.
              </p>
            )}
          </section>

          <section className={`${card} flex flex-col gap-3 p-5`}>
            <h2 className="text-base font-semibold">What did you do?</h2>
            <ul className="grid gap-3 xl:grid-cols-2">
              {products.map((p) => {
                const n = qty[p.id] ?? 0;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                      n > 0 ? "border-emerald-600 bg-emerald-600/10" : "border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{p.name}</span>
                      <span className="text-xs text-[#737373] tabular-nums">
                        {formatCents(p.priceCents)} {UNIT_LABEL[p.unit]}
                      </span>
                    </div>
                    <div className="flex flex-none items-center gap-1">
                      <button
                        type="button"
                        aria-label={`One less ${p.name}`}
                        disabled={n === 0}
                        onClick={() => bump(p.id, -1)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white disabled:opacity-40"
                      >
                        <Icon name="minus" />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                        {n}
                        {p.unit !== "flat" && <span className="block text-[10px] font-normal text-[#737373]">{UNIT_WORD[p.unit]}</span>}
                      </span>
                      <button
                        type="button"
                        aria-label={`One more ${p.name}`}
                        onClick={() => bump(p.id, 1)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white"
                      >
                        <Icon name="plus" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Custom amount</span>
                <input
                  className={input}
                  inputMode="decimal"
                  placeholder="$0.00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>What for? (optional)</span>
                <input
                  className={input}
                  placeholder="Oven, inside"
                  value={customFor}
                  onChange={(e) => setCustomFor(e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={`${card} flex flex-col gap-4 p-5`}>
            <label className="flex max-w-[220px] flex-col gap-1.5">
              <span className={label}>Date</span>
              <input type="date" className={input} value={date} max={DEMO_TODAY} onChange={(e) => setDate(e.target.value || DEMO_TODAY)} />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-base font-semibold">Paid?</legend>
              <div className="grid gap-2 xl:grid-cols-3">
                {(
                  [
                    ["cash", "Yes — cash", "Counts as money in right away."],
                    ["waiting", "Yes — digital", "Venmo, Zelle, Cash App… matched from your screenshots."],
                    ["owed", "No — owes me", "Goes on the Owed list."],
                  ] as [Paid, string, string][]
                ).map(([v, t, d]) => (
                  <label
                    key={v}
                    className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${
                      paid === v ? "border-emerald-600 bg-emerald-600/10" : "border-neutral-300 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="radio"
                        name="paid"
                        value={v}
                        checked={paid === v}
                        onChange={() => setPaid(v)}
                        className="accent-emerald-600"
                      />
                      {t}
                    </span>
                    <span className="text-xs text-[#737373]">{d}</span>
                  </label>
                ))}
              </div>
              {digitalBlocked && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Digital matching needs a client name — add one above, or take it as cash.
                </p>
              )}
            </fieldset>
          </section>
        </div>

        <aside className={`${card} flex flex-col gap-4 p-5 lg:sticky lg:top-6`}>
          <h2 className="text-base font-semibold">Checkout</h2>
          <div className="flex flex-col gap-1 text-sm">
            <span className={label}>Client</span>
            <span>{effectiveClient?.name ?? newName ?? "No client"}</span>
          </div>
          <ul className="flex flex-col divide-y divide-neutral-200 text-sm">
            {lines.length === 0 && <li className="py-2 text-[#737373]">No items yet</li>}
            {lines.map((l) => (
              <li key={l.label + l.productId} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {l.label}
                  {l.qty > 1 && <span className="text-[#737373]"> × {l.qty}</span>}
                </span>
                <span className="tabular-nums">{formatCents(l.cents)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3">
            <span className="text-sm text-[#525252]">Total</span>
            <span className="text-2xl font-semibold tabular-nums text-emerald-600">{formatCents(total)}</span>
          </div>
          <button type="button" className={primaryBtn} disabled={!canSave} onClick={save}>
            Log sale
          </button>
          {!canSave && (
            <p className="text-xs text-[#737373]">
              {total === 0 ? "Add at least one item or an amount." : paid === null ? "Choose whether they paid." : "Add a client name for digital."}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
