"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmationSheet from "./confirmation-sheet";
import Insights from "./insights";
import QuickAdd from "./quick-add";
import RunningTotals from "./running-totals";
import SignIn from "./sign-in";
import SwipeDeck from "./swipe-deck";
import { warningMessage, type ExtractionWarning } from "@/lib/extract/types";
import { getSupabase } from "@/lib/supabase/client";
import {
  insertTransactions,
  loadTransactions,
  updateTransaction as saveTransaction,
} from "@/lib/supabase/transactions";
import { useSession } from "@/lib/supabase/use-session";
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
  // Demo mode: the sign-in gate steps aside, nothing is saved. Deliberately
  // not persisted across reloads — a refresh returns to the real gate.
  const [demo, setDemo] = useState(false);
  const { user, loading, isConfigured } = useSession();

  /**
   * Writes go through here so one failed save can't lose what's on screen.
   * No signed-in user (unconfigured, or demo mode) means nothing to save —
   * row level security would reject the write anyway.
   */
  const persist = useCallback(async (work: () => Promise<void>) => {
    if (!isConfigured || !user) return;
    try {
      await work();
    } catch (cause) {
      console.error("Save failed:", cause);
      setError("Saved on screen but not to your account. Check your connection.");
      setStatus("error");
    }
  }, [isConfigured, user]);

  // Pull the ledger back down once we know who's signed in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    loadTransactions()
      .then((rows) => {
        if (cancelled) return;
        setTransactions(rows);
        // Un-triaged rows go back to the sheet, not straight to the deck —
        // if you closed the tab mid-confirm, you still get to check them.
        if (rows.some((tx) => tx.business === null)) setStage("confirm");
      })
      .catch((cause) => {
        console.error("Load failed:", cause);
        setError("Couldn't load your saved payments.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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

      // Save on arrival, not after confirming — closing the tab mid-sheet
      // shouldn't cost you the extraction you just paid for.
      if (user) await persist(() => insertTransactions(batch, user.id));
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
    void persist(() => saveTransaction(id, { business }));
  }

  function undo() {
    const last = decided.at(-1);
    if (!last) return;
    updateTransaction(last, { business: null });
    setDecided((current) => current.slice(0, -1));
    void persist(() => saveTransaction(last, { business: null }));
  }

  /** The sheet edits local state per keystroke; this is the one save point. */
  function confirmBatch() {
    setStage("sort");
    for (const tx of pending) {
      void persist(() =>
        saveTransaction(tx.id, {
          payer: tx.payer,
          amountCents: tx.amountCents,
          date: tx.date,
          memo: tx.memo,
        }),
      );
    }
  }

  function startOver() {
    setTransactions([]);
    setWarnings([]);
    setDecided([]);
    setStage("upload");
  }

  const pending = transactions.filter((tx) => tx.business === null);
  const sorted = transactions.filter((tx) => tx.business !== null);

  // Don't flash the sign-in form at someone who is already signed in.
  if (loading) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  // Configured but signed out: the ledger belongs to an account.
  if (isConfigured && !user && !demo) {
    return <SignIn onDemo={() => setDemo(true)} />;
  }

  // The numpad owns the screen while it's open — one hand, one thing at a time.
  if (quickAdd) {
    return (
      <QuickAdd
        onSave={(tx) => {
          setTransactions((current) => [...current, tx]);
          if (user) void persist(() => insertTransactions([tx], user.id));
        }}
        onClose={() => setQuickAdd(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {(stage === "sort" || sorted.length > 0) && (
        <RunningTotals transactions={transactions} />
      )}

      {user && (
        <p className="flex items-center justify-between text-xs text-neutral-500">
          <span>{user.email}</span>
          <button
            type="button"
            className="hover:underline"
            onClick={() => getSupabase()?.auth.signOut()}
          >
            Sign out
          </button>
        </p>
      )}

      {demo && !user && (
        <p className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span>Demo mode — nothing is saved.</span>
          <button
            type="button"
            className="font-medium hover:underline"
            onClick={() => setDemo(false)}
          >
            Sign in
          </button>
        </p>
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
            onClick={confirmBatch}
          >
            Looks right — start sorting
          </button>
        </>
      )}

      {stage === "sort" && (
        <>
          {/* Shown the moment a batch is confirmed, before any sorting —
              the first upload has to teach you something. */}
          <Insights transactions={transactions} />

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
              {user ? (
                <p className="text-xs text-neutral-500">
                  Saved to your account. It&apos;ll be here next time you open
                  this on any device.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    className="block w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50"
                    onClick={startOver}
                  >
                    Clear and start over
                  </button>
                  <p className="text-xs text-neutral-500">
                    Not signed in, so nothing is saved. Clearing loses these
                    totals.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
