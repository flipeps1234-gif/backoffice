"use client";

import { useState } from "react";
import { formatCents, type Transaction } from "@/lib/transaction";

/**
 * Amount first. You get paid $60 cash in a driveway and the very first thing
 * your thumb does is type 6-0-0-0. Everything else is optional.
 *
 * Digits fill cents from the right, so "6000" is $60.00 and there is no
 * decimal key to hunt for.
 */

const MAX_CENTS = 99_999_999; // $999,999.99 — a typo guard, not a real limit
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

const today = () => new Date().toISOString().slice(0, 10);

export default function QuickAdd({
  onSave,
  onClose,
}: {
  onSave: (tx: Transaction) => void;
  onClose: () => void;
}) {
  const [cents, setCents] = useState(0);
  const [payer, setPayer] = useState("");
  const [date, setDate] = useState(today);
  const [business, setBusiness] = useState(true);
  const [justSaved, setJustSaved] = useState("");

  function press(key: string) {
    if (key === "⌫") {
      setCents((current) => Math.floor(current / 10));
      return;
    }
    setCents((current) => {
      const next = current * 10 + Number(key);
      return next > MAX_CENTS ? current : next;
    });
  }

  function build(): Transaction {
    return {
      // A real uuid, because this id becomes the primary key in Postgres.
      // Generated here (not by the database) so the row can render instantly
      // and be updated by id before the insert comes back.
      id: crypto.randomUUID(),
      payer: payer.trim(),
      amountCents: cents,
      date,
      memo: "",
      source: "manual",
      business,
      confidence: {},
    };
  }

  function save(addAnother: boolean) {
    if (cents === 0) return;
    const tx = build();
    onSave(tx);

    if (!addAnother) {
      onClose();
      return;
    }
    // Keep the date and the business/personal choice — the next cash payment
    // that day is almost always the same kind.
    setJustSaved(`${formatCents(tx.amountCents)} logged`);
    setCents(0);
    setPayer("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Log a cash payment</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <p
        aria-live="polite"
        className="text-center text-5xl font-semibold tabular-nums"
      >
        {formatCents(cents)}
      </p>

      {justSaved && (
        <p className="text-center text-sm text-emerald-600">{justSaved}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key, index) =>
          key === "" ? (
            <span key={`gap-${index}`} />
          ) : (
            <button
              key={key}
              type="button"
              aria-label={key === "⌫" ? "Delete" : key}
              className="rounded-lg border border-neutral-300 bg-white py-4 text-xl font-medium text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
              onClick={() => press(key)}
            >
              {key}
            </button>
          ),
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={business}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium ${
            business
              ? "bg-emerald-600 text-white"
              : "border border-neutral-300 bg-white text-neutral-900"
          }`}
          onClick={() => setBusiness(true)}
        >
          Business
        </button>
        <button
          type="button"
          aria-pressed={!business}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium ${
            business
              ? "border border-neutral-300 bg-white text-neutral-900"
              : "bg-foreground text-background"
          }`}
          onClick={() => setBusiness(false)}
        >
          Personal
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label
            className="mb-1 block text-xs font-medium text-neutral-500"
            htmlFor="quick-payer"
          >
            Who paid (optional)
          </label>
          <input
            id="quick-payer"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            placeholder="Name"
            value={payer}
            onChange={(event) => setPayer(event.target.value)}
          />
        </div>
        <div className="w-40">
          <label
            className="mb-1 block text-xs font-medium text-neutral-500"
            htmlFor="quick-date"
          >
            Date
          </label>
          <input
            id="quick-date"
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
          disabled={cents === 0}
          onClick={() => save(false)}
        >
          Save
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg border border-neutral-400 px-4 py-4 text-base font-medium text-foreground hover:opacity-80 disabled:opacity-40"
          disabled={cents === 0}
          onClick={() => save(true)}
        >
          Save &amp; add another
        </button>
      </div>
    </div>
  );
}
