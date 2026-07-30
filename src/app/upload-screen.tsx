"use client";

import { useState } from "react";
import ConfirmationSheet from "./confirmation-sheet";
import QuickAdd from "./quick-add";
import RunningTotals from "./running-totals";
import SwipeDeck from "./swipe-deck";
import { warningMessage, type ExtractionWarning } from "@/lib/extract/types";
import type { Transaction } from "@/lib/transaction";

type Status = "idle" | "reading" | "error";
/** upload → confirm what we read → sort each one → totals. */
type Stage = "upload" | "confirm" | "sort";

export default function UploadScreen() {
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<Stage>("upload");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [warnings, setWarnings] = useState<ExtractionWarning[]>([]);
  const [error, setError] = useState("");
  const [decided, setDecided] = useState<string[]>([]);
  const [quickAdd, setQuickAdd] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setStatus("reading");
    setError("");

    const body = new FormData();
    for (const file of files) body.append("screenshots", file);

    try {
      const response = await fetch("/api/extract", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong reading those.");
        setStatus("error");
        return;
      }
      // Append — a new batch of screenshots must never wipe cash already logged.
      // Re-id on arrival: extraction ids are derived from payer + amount, so
      // two batches containing the same payment would otherwise collide.
      const batch: Transaction[] = data.transactions.map((tx: Transaction) => ({
        ...tx,
        id: crypto.randomUUID(),
      }));
      setTransactions((current) => [...current, ...batch]);
      setWarnings(data.warnings);
      setStatus("idle");
      if (batch.length > 0) setStage("confirm");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  // Replace one row, leave the rest untouched.
  function updateTransaction(id: string, patch: Partial<Transaction>) {
    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)),
    );
  }

  function decide(id: string, business: boolean) {
    updateTransaction(id, { business });
    setDecided((current) => [...current, id]);
  }

  function undo() {
    const last = decided.at(-1);
    if (!last) return;
    updateTransaction(last, { business: null });
    setDecided((current) => current.slice(0, -1));
  }

  function startOver() {
    setTransactions([]);
    setWarnings([]);
    setDecided([]);
    setStage("upload");
  }

  const pending = transactions.filter((tx) => tx.business === null);
  const sorted = transactions.filter((tx) => tx.business !== null);

  // The numpad owns the screen while it's open — one hand, one thing at a time.
  if (quickAdd) {
    return (
      <QuickAdd
        onSave={(tx) => setTransactions((current) => [...current, tx])}
        onClose={() => setQuickAdd(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {(stage === "sort" || sorted.length > 0) && (
        <RunningTotals transactions={transactions} />
      )}

      {stage === "upload" && (
        <label className="block cursor-pointer rounded-lg border-2 border-dashed border-neutral-300 px-6 py-10 text-center hover:border-neutral-500">
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <span className="block text-base font-medium">
            Add screenshots of your payments
          </span>
          <span className="mt-1 block text-sm text-neutral-500">
            Venmo, Cash App, or Zelle. Pick as many as you like.
          </span>
        </label>
      )}

      {stage !== "confirm" && (
        <button
          type="button"
          className="w-full rounded-lg border border-neutral-300 px-4 py-4 text-base font-medium hover:bg-neutral-50"
          onClick={() => setQuickAdd(true)}
        >
          Log a cash payment
        </button>
      )}

      {status === "reading" && (
        <p className="text-sm text-neutral-500">Reading your screenshots…</p>
      )}

      {status === "error" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      {stage === "upload" &&
        warnings.map((warning, index) => (
          <p
            key={`${warning.code}-${index}`}
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            {warning.filename && (
              <span className="font-medium">{warning.filename}: </span>
            )}
            {warningMessage(warning)}
          </p>
        ))}

      {stage === "confirm" && (
        <>
          {/* Only the new batch needs confirming — anything already sorted
              (cash, or an earlier batch) has business set and is excluded. */}
          <ConfirmationSheet transactions={pending} onChange={updateTransaction} />
          <button
            type="button"
            className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90"
            onClick={() => setStage("sort")}
          >
            Looks right — start sorting
          </button>
        </>
      )}

      {stage === "sort" && (
        <>
          {pending.length > 0 ? (
            <SwipeDeck
              pending={pending}
              onDecide={decide}
              onUndo={undo}
              canUndo={decided.length > 0}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium">
                All sorted. That&apos;s your money in.
              </p>
              <button
                type="button"
                className="text-sm text-neutral-500 hover:underline"
                onClick={undo}
                disabled={decided.length === 0}
              >
                Undo last
              </button>
              <button
                type="button"
                className="block w-full rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background hover:opacity-90"
                onClick={() => setStage("upload")}
              >
                Add more screenshots
              </button>
              <button
                type="button"
                className="block w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50"
                onClick={startOver}
              >
                Clear and start over
              </button>
              <p className="text-xs text-neutral-500">
                Nothing is saved yet — that arrives with accounts in v0.2.
                Clearing loses these totals.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
