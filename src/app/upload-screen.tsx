"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmationSheet from "./confirmation-sheet";
import Insights from "./insights";
import QuickAdd from "./quick-add";
import RunningTotals from "./running-totals";
import SignIn from "./sign-in";
import SwipeDeck from "./swipe-deck";
import { isDuplicate } from "@/lib/extract/dedupe";
import { warningMessage, type ExtractionWarning } from "@/lib/extract/types";
import { getSupabase } from "@/lib/supabase/client";
import { insertService, loadServices } from "@/lib/supabase/services";
import {
  insertTransactions,
  loadTransactions,
  updateTransaction as saveTransaction,
} from "@/lib/supabase/transactions";
import { useSession } from "@/lib/supabase/use-session";
import type { Service } from "@/lib/service";
import type { Transaction } from "@/lib/transaction";

type Status = "idle" | "reading" | "error";
/** upload → confirm what we read → sort each one → totals. */
type Stage = "upload" | "confirm" | "sort";

/**
 * The session gate. The ledger below is keyed on the account, so switching
 * accounts — sign-in, sign-out, tester — REMOUNTS it with fresh state. One
 * account's rows structurally cannot survive into another's session on a
 * shared device: the component holding them is gone.
 */
export default function UploadScreen() {
  const { user, loading, isConfigured } = useSession();

  // Don't flash the sign-in form at someone who is already signed in.
  if (loading) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  // Configured but signed out: the ledger belongs to an account. Typing the
  // demo word signs into the shared tester account — a real session.
  if (isConfigured && !user) {
    return <SignIn />;
  }

  return (
    <Ledger
      key={user?.id ?? "anon"}
      accountId={user?.id ?? null}
      email={user?.email ?? null}
      isConfigured={isConfigured}
      // The tester account's email is created with local part "tester" —
      // that's the whole convention. Anyone signed into it shares its data.
      demoAccount={user?.email?.split("@")[0]?.toLowerCase() === "tester"}
    />
  );
}

function Ledger({
  accountId,
  email,
  isConfigured,
  demoAccount,
}: {
  accountId: string | null;
  email: string | null;
  isConfigured: boolean;
  demoAccount: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<Stage>("upload");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [warnings, setWarnings] = useState<ExtractionWarning[]>([]);
  const [batchNotice, setBatchNotice] = useState("");
  const [error, setError] = useState("");
  const [decided, setDecided] = useState<string[]>([]);
  const [quickAdd, setQuickAdd] = useState(false);
  /** Ids of the most recently read batch — what the insights describe. */
  const [lastBatchIds, setLastBatchIds] = useState<string[]>([]);

  /**
   * ALL database writes flow through here, one at a time, in call order.
   * Serialising them closes a whole family of races at once: a service
   * insert must land before a transaction that references it, and a row's
   * INSERT must land before any UPDATE to that row — a Supabase update that
   * matches zero rows "succeeds" silently, which is how edits get lost.
   * The queue never wedges: failures are caught and surfaced as a banner.
   */
  const writeChain = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback(
    (work: () => Promise<void>): Promise<void> => {
      const next = writeChain.current.then(async () => {
        if (!isConfigured || !accountId) return;
        try {
          await work();
        } catch (cause) {
          console.error("Save failed:", cause);
          setError(
            "Saved on screen but not to your account. Check your connection.",
          );
          setStatus("error");
        }
      });
      writeChain.current = next;
      return next;
    },
    [isConfigured, accountId],
  );

  // Pull the ledger back down. This component is keyed on the account, so
  // the effect runs exactly once per account, on a freshly mounted state.
  useEffect(() => {
    if (!accountId) return;
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

    loadServices()
      .then((rows) => {
        if (!cancelled) setServices(rows);
      })
      .catch((cause) => {
        // The numpad still works without chips; don't block the app on this.
        console.error("Services load failed:", cause);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setStatus("reading");
    setError("");

    const body = new FormData();
    for (const file of files) body.append("screenshots", file);

    // The paid extraction path is gated on being signed in; the token proves
    // it. Demo and unconfigured callers send none and get the free mock.
    const headers: Record<string, string> = {};
    const session = (await getSupabase()?.auth.getSession())?.data.session;
    if (session) headers.authorization = `Bearer ${session.access_token}`;

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers,
        body,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong reading those.");
        setStatus("error");
        return;
      }

      // Re-id on arrival: extraction ids are derived from payer + amount, so
      // two batches containing the same payment would otherwise collide.
      const batch: Transaction[] = data.transactions.map((tx: Transaction) => ({
        ...tx,
        id: crypto.randomUUID(),
      }));

      // Server dedupe only sees one request's files. Screen the batch against
      // screenshot rows already on the ledger, or overlapping screenshots
      // uploaded across two batches silently double every total. Cash rows
      // are exempt: a $60 cash entry and a $60 Venmo row may both be real.
      const priorScreens = transactions.filter(
        (tx) => tx.source === "screenshot",
      );
      const fresh = batch.filter(
        (tx) => !priorScreens.some((prev) => isDuplicate(prev, tx)),
      );
      const skipped = batch.length - fresh.length;
      setBatchNotice(
        skipped > 0
          ? `Skipped ${skipped} payment${skipped === 1 ? "" : "s"} already on your ledger.`
          : "",
      );

      // Append — a new batch must never wipe what's already here.
      setTransactions((current) => [...current, ...fresh]);
      setWarnings(data.warnings);
      setLastBatchIds(fresh.map((tx) => tx.id));
      setStatus("idle");
      if (fresh.length > 0) setStage("confirm");

      // Save on arrival, not after confirming — closing the tab mid-sheet
      // shouldn't cost you the extraction you just paid for.
      if (accountId) await persist(() => insertTransactions(fresh, accountId));
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

  function moreScreenshots() {
    // Stale batch messages don't belong on a fresh upload screen.
    setWarnings([]);
    setBatchNotice("");
    setStage("upload");
  }

  function startOver() {
    setTransactions([]);
    setWarnings([]);
    setBatchNotice("");
    setDecided([]);
    setLastBatchIds([]);
    setStage("upload");
  }

  const pending = transactions.filter((tx) => tx.business === null);
  const sorted = transactions.filter((tx) => tx.business !== null);
  const lastBatch = transactions.filter((tx) => lastBatchIds.includes(tx.id));

  // The numpad owns the screen while it's open — one hand, one thing at a time.
  if (quickAdd) {
    return (
      <QuickAdd
        services={services}
        onSave={(tx) => {
          setTransactions((current) => [...current, tx]);
          if (accountId) {
            void persist(() => insertTransactions([tx], accountId));
          }
        }}
        onCreateService={(service) => {
          setServices((current) => [...current, service]);
          if (accountId) {
            void persist(() => insertService(service, accountId));
          }
        }}
        onLinkService={(txId, serviceId) => {
          updateTransaction(txId, { serviceId });
          void persist(() => saveTransaction(txId, { serviceId }));
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

      {accountId && (
        <p className="flex items-center justify-between text-xs text-neutral-500">
          <span>{email}</span>
          <button
            type="button"
            className="hover:underline"
            onClick={() => getSupabase()?.auth.signOut()}
          >
            Sign out
          </button>
        </p>
      )}

      {demoAccount && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Shared test account — everyone who types the demo word sees what you
          save here. Try everything; don&apos;t put real numbers in.
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

      {/* Batch messages describe the batch wherever the user is looking —
          gating them to one stage hid them exactly when they mattered. */}
      {batchNotice && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {batchNotice}
        </p>
      )}

      {warnings.map((warning, index) => (
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
          {/* "What we found" is about the batch just read — not the whole
              ledger, which already includes cash and loaded history. */}
          <Insights transactions={lastBatch} />

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
                onClick={moreScreenshots}
              >
                Add more screenshots
              </button>
              {accountId ? (
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
