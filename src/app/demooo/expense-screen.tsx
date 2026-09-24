"use client";

import { useState } from "react";
import { dollarsToCents, formatCents } from "@/lib/transaction";
import { CATEGORIES, DEMO_TODAY, dayLabel, type Entry } from "./data";
import { ScreenHeader, Segmented, card, input, label, primaryBtn, secondaryBtn } from "./ui";

export type ExpenseDraft = {
  cents: number;
  business: boolean;
  category: string;
  where: string;
  date: string;
};

export default function ExpenseScreen({
  recent,
  onSave,
}: {
  recent: Entry[];
  onSave: (draft: ExpenseDraft) => void;
}) {
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"business" | "personal">("business");
  const [category, setCategory] = useState("");
  const [where, setWhere] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);

  const cents = dollarsToCents(amount);

  function save(keepGoing: boolean) {
    if (cents <= 0) return;
    onSave({ cents, business: kind === "business", category, where: where.trim(), date });
    setAmount("");
    setWhere("");
    if (!keepGoing) {
      setCategory("");
      setDate(DEMO_TODAY);
    }
  }

  return (
    <>
      <ScreenHeader title="Log expense" sub="Money you spent — supplies, gas, a helper, anything." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          className={`${card} flex flex-col gap-5 p-5`}
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className={label}>How much?</span>
            <div className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 focus-within:border-neutral-900">
              <span className="flex-none whitespace-nowrap text-3xl font-semibold text-[#737373]">−$</span>
              <input
                className="h-16 min-w-0 flex-1 bg-transparent text-4xl font-semibold tabular-nums text-red-600 outline-none placeholder:text-[#d4d4d4]"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Amount in dollars"
              />
            </div>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className={label}>Whose money?</span>
            <Segmented
              ariaLabel="Business or personal"
              value={kind}
              onChange={setKind}
              options={[
                { value: "business", label: "Business" },
                { value: "personal", label: "Personal" },
              ]}
            />
            <span className="text-xs text-[#737373]">
              {kind === "business"
                ? "Counts against what you kept, and goes in the tax export."
                : "Kept in your history, left out of the business totals."}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={label}>What kind of expense? (optional)</span>
              <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">No category</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Where (optional)</span>
              <input className={input} placeholder="Gas station" value={where} onChange={(e) => setWhere(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Date</span>
              <input type="date" className={input} value={date} max={DEMO_TODAY} onChange={(e) => setDate(e.target.value || DEMO_TODAY)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryBtn} disabled={cents <= 0}>
              Log {cents > 0 ? `−${formatCents(cents)}` : "expense"}
            </button>
            <button type="button" className={secondaryBtn} disabled={cents <= 0} onClick={() => save(true)}>
              Save &amp; add another
            </button>
          </div>
        </form>

        <section className={`${card} flex flex-col p-5`}>
          <h2 className="pb-2 text-base font-semibold">Recent expenses</h2>
          <ul className="flex flex-col divide-y divide-neutral-200">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{e.name}</span>
                  <span className="text-xs text-[#737373]">
                    {dayLabel(e.date)} · {e.what}
                    {!e.business && " · personal"}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-red-600">−{formatCents(e.cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
