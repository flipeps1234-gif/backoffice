"use client";

import { useState } from "react";
import { dollarsToCents, formatCents } from "@/lib/transaction";
import { UNIT_LABEL, type Product, type Unit } from "./data";
import type { ServiceTotal } from "./dashboard-screen";
import { Icon, ScreenHeader, card, input, label, primaryBtn, secondaryBtn } from "./ui";

export default function ProductsScreen({
  products,
  totals,
  onAdd,
}: {
  products: Product[];
  totals: ServiceTotal[];
  onAdd: (p: { name: string; unit: Unit; priceCents: number; costCents: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Unit>("flat");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const trimmed = name.trim();
    const priceCents = dollarsToCents(price);
    if (!trimmed) return setError("Give it a name.");
    if (products.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()))
      return setError(`You already have “${trimmed}”.`);
    if (priceCents === 0) return setError("Price can't be zero.");
    onAdd({ name: trimmed, unit, priceCents, costCents: dollarsToCents(cost) });
    setOpen(false);
    setName("");
    setUnit("flat");
    setPrice("");
    setCost("");
    setError(null);
  }

  const per = unit === "flat" ? "" : ` per ${unit === "sqft" ? "sq ft" : unit}`;

  return (
    <>
      <ScreenHeader title="Products and services" sub="What you sell, what it costs you, and what you keep.">
        {!open && (
          <button type="button" className={primaryBtn} onClick={() => setOpen(true)}>
            <Icon name="plus" />
            New product
          </button>
        )}
      </ScreenHeader>

      {open && (
        <form
          className={`${card} grid gap-4 p-5 lg:grid-cols-4`}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="flex flex-col gap-1.5 lg:col-span-2">
            <span className={label}>What do you call it?</span>
            <input className={input} placeholder="Carpet shampoo" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="flex flex-col gap-1.5 lg:col-span-2">
            <span className={label}>How do you price it?</span>
            <select className={input} value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="flat">Flat</option>
              <option value="hour">per hour</option>
              <option value="room">per room</option>
              <option value="sqft">per sq ft</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 lg:col-span-2">
            <span className={label}>Gain — price{per}</span>
            <input className={input} inputMode="decimal" placeholder="$0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 lg:col-span-2">
            <span className={label}>Loss — your cost{per} (optional)</span>
            <input className={input} inputMode="decimal" placeholder="gas, supplies…" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
          {error && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 lg:col-span-4">{error}</p>
          )}
          <div className="flex gap-2 lg:col-span-4">
            <button type="submit" className={primaryBtn}>
              Save product
            </button>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => {
          const t = totals.find((x) => x.id === p.id);
          const net = p.priceCents - p.costCents;
          return (
            <li key={p.id} className={`${card} flex flex-col gap-4 p-5`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold">{p.name}</h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-[#525252] ring-1 ring-neutral-200">
                  {UNIT_LABEL[p.unit]}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex flex-col">
                  <dt className="text-xs text-[#737373]">Gain</dt>
                  <dd className="font-semibold tabular-nums">{formatCents(p.priceCents)}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-[#737373]">Loss</dt>
                  <dd className="font-semibold tabular-nums text-red-600">
                    {p.costCents ? `−${formatCents(p.costCents)}` : "—"}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-[#737373]">Net</dt>
                  <dd className="font-semibold tabular-nums text-emerald-700">{formatCents(net)}</dd>
                </div>
              </dl>
              <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3 text-sm">
                <span className="text-[#737373]">{t?.jobs ?? 0} jobs in 2026</span>
                <span className="font-semibold tabular-nums">{formatCents(t?.cents ?? 0)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
