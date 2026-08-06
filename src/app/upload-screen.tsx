"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ConfirmationSheet from "./confirmation-sheet";
import DropZone from "./drop-zone";
import Dashboard from "./dashboard";
import HistoryList, { type LogAgainPrefill } from "./history-list";
import Insights from "./insights";
import QuickAdd from "./quick-add";
import RunningTotals from "./running-totals";
import SignIn from "./sign-in";
import SwipeDeck from "./swipe-deck";
import TermsGate, { useAcceptedTerms } from "./terms-gate";
import { chunkForUpload, compressImage } from "@/lib/compress-image";
import { isSupportedImage } from "@/lib/extract/image-types";
import { knownPayers, rememberedFor } from "@/lib/customer-memory";
import { dedupe, isDuplicate } from "@/lib/extract/dedupe";
import { warningMessage, type ExtractionWarning } from "@/lib/extract/types";
import { getSupabase } from "@/lib/supabase/client";
import { insertService, loadServices } from "@/lib/supabase/services";
import {
  insertTransactions,
  loadTransactions,
  updateTransaction as saveTransaction,
} from "@/lib/supabase/transactions";
import { useSession } from "@/lib/supabase/use-session";
import { acceptTerms, TERMS_VERSION } from "@/lib/terms";
import type { Service } from "@/lib/service";
import type { Transaction } from "@/lib/transaction";

/**
 * Is the desktop rail on screen? `lg:hidden` would only make it INVISIBLE —
 * React still renders it, so a phone would recompute the whole dashboard
 * (byMonth, revenueByService, marginByService) and reconcile every history
 * row on each keystroke in the confirmation sheet, for markup no one can
 * see. This gates the rail on the same breakpoint so phones don't build it
 * at all.
 *
 * useSyncExternalStore rather than an effect: it is SSR-safe via the third
 * argument, and it subscribes instead of writing state during render.
 */
const DESKTOP = "(min-width: 64rem)";
const subscribeToDesktop = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useIsDesktop = (): boolean =>
  useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP).matches,
    // Server and first paint: assume phone. The rail appears on hydration.
    () => false,
  );

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
  const accepted = useAcceptedTerms();
  const { user, loading, isConfigured } = useSession();

  // Don't flash the sign-in form at someone who is already signed in, and
  // don't flash the terms at someone who has already accepted them: `accepted`
  // is undefined until localStorage has actually been read.
  if (loading || accepted === undefined) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  // Before sign-in, deliberately. The disclosure that screenshots leave the
  // device has to come before we ask for an email address.
  if (accepted !== TERMS_VERSION) {
    return <TermsGate onAccept={acceptTerms} />;
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
  const [readingNote, setReadingNote] = useState("");
  const [error, setError] = useState("");
  const [decided, setDecided] = useState<string[]>([]);
  const [quickAdd, setQuickAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  /** Set by History's "Log again" — opens the numpad pre-filled. */
  const [logAgain, setLogAgain] = useState<LogAgainPrefill | null>(null);
  /**
   * Bumped on every "log again", and used as QuickAdd's key so a new prefill
   * REMOUNTS it. QuickAdd seeds every field from `prefill` in useState
   * initialisers, which run once — before the desktop rail existed that was
   * safe, because History was a takeover and picking a row always unmounted
   * it first. Now History sits beside the open numpad, so a second click
   * would change `logAgain` while React reused the same instance: the numpad
   * would keep showing the PREVIOUS row's payer and amount, and saving would
   * log that one again instead of the row just picked.
   *
   * A counter, not a key derived from the prefill: two identical rows (same
   * payer, same amount, same service) are exactly the repeat business this
   * app is for, and a content key would collide on precisely those.
   */
  const [logAgainSeq, setLogAgainSeq] = useState(0);
  const isDesktop = useIsDesktop();
  const pickLogAgain = useCallback((prefill: LogAgainPrefill) => {
    setLogAgain(prefill);
    setLogAgainSeq((n) => n + 1);
  }, []);
  /** Ids of the most recently read batch — what the insights describe. */
  const [lastBatchIds, setLastBatchIds] = useState<string[]>([]);
  /** Set when any database write failed — see the finish copy. */
  const [saveFailed, setSaveFailed] = useState(false);

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
          // Remembered, not just flashed: the finish copy below promises the
          // batch is on the user's account "next time you open this on any
          // device". After a failed write that sentence is false, and it is
          // the only thing standing between them and losing the batch.
          setSaveFailed(true);
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

  // A file dropped anywhere but the box makes the browser navigate to that
  // file, which throws away everything on screen that hasn't been saved yet.
  // Swallowing the page-level drop turns a near-miss into a no-op.
  //
  // Only for drags CARRYING FILES. A blanket preventDefault here would also
  // cancel dropping selected text into the payer, memo, and amount fields —
  // the field would show a caret, accept the drop, and silently discard it.
  useEffect(() => {
    const swallow = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  /**
   * One upload at a time, enforced with a ref rather than `status`.
   *
   * A second upload starting mid-flight is how the ledger doubles: the first
   * call already captured `transactions` for its duplicate screen, so the
   * second screens the same screenshots against a snapshot that doesn't
   * contain the first batch, every row looks new, and both copies persist —
   * with fresh uuids, so the database can't catch it either. isDuplicate is
   * the only thing standing between a re-drop and double revenue.
   *
   * A ref, not state: the check has to see the truth at call time, not the
   * value the handler closed over when it rendered.
   */
  const reading = useRef(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (reading.current) return;
    reading.current = true;
    try {
      await readFiles(files);
    } catch (cause) {
      // Anything readFiles doesn't handle itself lands here — notably
      // auth.getSession(), which is awaited outside its own try. Without this
      // catch the ref is released but `status` stays "reading" forever, and
      // since the upload targets go inert while reading, the user is locked
      // out of uploading with no error on screen until they reload.
      console.error("Upload failed:", cause);
      setError("Something went wrong reading those. Try again.");
      setStatus("error");
    } finally {
      reading.current = false;
    }
  }

  async function readFiles(files: FileList) {
    // accept="image/*" is only advice: the file dialog lets you switch it off,
    // and a drag-and-drop never consults it at all. Filter here so both ways
    // in are covered, rather than letting a PDF reach the compressor.
    const images = [...files].filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Those aren't images. Screenshots or photos of receipts only.");
      setStatus("error");
      // Don't leave the last batch's messages sitting under a new error.
      setBatchNotice("");
      setWarnings([]);
      return;
    }
    const nonImages = files.length - images.length;

    setStatus("reading");
    setError("");
    setReadingNote("");

    // Compress in the browser first: Vercel rejects request bodies over
    // 4.5MB before our code runs, and smaller images cost less to extract.
    const compressed = await Promise.all(images.map(compressImage));

    // Allowlist AFTER compressing, not before: compressImage re-encodes to
    // JPEG whenever the browser can decode the original, so an iPhone HEIC
    // usually arrives here already supported. What's left is what nothing
    // could read — and sending it would 400 and abort the rest of the batch.
    const usable = compressed.filter(isSupportedImage);
    const unsupported = compressed.length - usable.length;
    if (usable.length === 0) {
      setError(
        "Couldn't read that format. A screenshot works best — or set your " +
          "camera to Most Compatible.",
      );
      setStatus("error");
      setBatchNotice("");
      setWarnings([]);
      return;
    }
    // Then send in chunks that stay under the body cap.
    const chunks = chunkForUpload(usable);

    // The paid extraction path is gated on being signed in; the token proves
    // it. Demo and unconfigured callers send none and get the free mock.
    const headers: Record<string, string> = {};
    const session = (await getSupabase()?.auth.getSession())?.data.session;
    if (session) headers.authorization = `Bearer ${session.access_token}`;

    const collected: Transaction[] = [];
    const collectedWarnings: typeof warnings = [];
    let failed = false;
    // The message travels in a local, not in `error` state. Reading state
    // back here would read the closure's value — "" at every point in this
    // run — so the specific reason ("Check your connection", the route's 429
    // text) got replaced by a generic one at the zero-result exit below.
    let failMessage = "";
    // Files in chunks we never got to. The loop breaks on the first failure,
    // and every exit below except one skips the ignored-count notice — so a
    // 12-screenshot upload that died on chunk 2 used to show 5 payments and
    // say nothing at all about the 4 that were never sent.
    let unsentFiles = 0;
    const remaining = (index: number) =>
      chunks.slice(index).reduce((n, c) => n + c.length, 0);

    for (const [index, chunk] of chunks.entries()) {
      if (chunks.length > 1) {
        setReadingNote(`batch ${index + 1} of ${chunks.length}`);
      }
      const body = new FormData();
      for (const file of chunk) body.append("screenshots", file);

      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers,
          body,
        });
        const data = await response.json();
        if (!response.ok) {
          failMessage = data.error ?? "Something went wrong reading those.";
          unsentFiles = remaining(index);
          setError(failMessage);
          failed = true;
          break;
        }
        // Defence in depth against invented rows. The mock fabricates payers,
        // amounts and confidences high enough that the sheet won't flag them,
        // and rows are written to the database before the swipe — so a real
        // account must never accept them, whatever the server decided.
        if (accountId && data.provider === "mock") {
          failMessage =
            "Reading screenshots is unavailable right now. Nothing was read.";
          unsentFiles = remaining(index);
          setError(failMessage);
          failed = true;
          break;
        }
        collected.push(...data.transactions);
        collectedWarnings.push(...data.warnings);
      } catch {
        failMessage =
          "Couldn't reach the server. Check your connection and try again.";
        unsentFiles = remaining(index);
        setError(failMessage);
        failed = true;
        break;
      }
    }

    setReadingNote("");
    if (collected.length === 0 && collectedWarnings.length === 0) {
      // Nothing was read at all — a pure failure. It needs its OWN message:
      // `error` was cleared at the top of this run and, when every chunk
      // returns 200 with nothing in it, no code path has set it since — so
      // setStatus("error") alone renders an empty red box. "Never fail
      // silently" is the rule this was breaking.
      const ignored = nonImages + unsupported + unsentFiles;
      setError(
        failed
          ? failMessage ||
              "Something went wrong reading those, and nothing came back."
          : "We couldn't read any payments from those. Screenshot your " +
              "Transactions list — a social feed hides the amounts.",
      );
      // This is also the one exit that skipped the ignored-file count, so a
      // dropped PDF plus an unreadable screenshot said nothing about either.
      setBatchNotice(
        ignored > 0
          ? `Ignored ${ignored} file${ignored === 1 ? "" : "s"} we couldn't read.`
          : "",
      );
      setStatus("error");
      return;
    }
    if (failed) {
      // Partial batch: keep what succeeded, and the error banner explains.
      setStatus("error");
    } else {
      setStatus("idle");
    }

    {
      // The same payment can appear in two chunks (overlapping screenshots
      // split across requests) — server dedupe only ever saw one chunk.
      const merged = dedupe(collected);

      // Re-id on arrival: extraction ids are derived from payer + amount, so
      // two batches containing the same payment would otherwise collide.
      const batch: Transaction[] = merged.map((tx: Transaction) => ({
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
      const notices: string[] = [];
      const ignored = nonImages + unsupported;
      if (unsentFiles > 0) {
        notices.push(
          `${unsentFiles} screenshot${unsentFiles === 1 ? " was" : "s were"} never read — upload ${unsentFiles === 1 ? "it" : "them"} again.`,
        );
      }
      if (ignored > 0) {
        notices.push(
          `Ignored ${ignored} file${ignored === 1 ? "" : "s"} we couldn't read.`,
        );
      }
      if (skipped > 0) {
        notices.push(
          `Skipped ${skipped} payment${skipped === 1 ? "" : "s"} already on your ledger.`,
        );
      }
      setBatchNotice(notices.join(" "));

      // Prepend — the array is newest-first EVERYWHERE: database loads come
      // newest-first, so in-session additions must too. Customer memory and
      // the payer list both break ties by position and rely on this.
      setTransactions((current) => [...fresh, ...current]);
      setWarnings(collectedWarnings);
      setLastBatchIds(fresh.map((tx) => tx.id));
      if (fresh.length > 0) setStage("confirm");

      // Save on arrival, not after confirming — closing the tab mid-sheet
      // shouldn't cost you the extraction you just paid for.
      if (accountId) await persist(() => insertTransactions(fresh, accountId));
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
          // The user can flip in/out on the sheet — a misread sign is the
          // most consequential extraction error there is.
          direction: tx.direction,
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

  // The flow column shows exactly one thing at a time: a takeover — the
  // numpad, or (on phones only, where there's no rail) history/dashboard —
  // and otherwise the main loop below. null means "nothing took over".
  let takeover: React.ReactNode = null;
  if (quickAdd || logAgain) {
    takeover = (
      <QuickAdd
        key={`quick-add-${logAgainSeq}`}
        services={services}
        prefill={logAgain ?? undefined}
        remember={(payer, serviceId) =>
          rememberedFor(transactions, payer, serviceId)
        }
        payerSuggestions={knownPayers(transactions)}
        onSave={(tx) => {
          // Prepend: the array stays newest-first (see the batch comment).
          setTransactions((current) => [tx, ...current]);
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
        onClose={() => {
          setQuickAdd(false);
          setLogAgain(null);
        }}
      />
    );
  } else if (showDashboard) {
    takeover = (
      <Dashboard
        transactions={transactions}
        services={services}
        onClose={() => setShowDashboard(false)}
      />
    );
  } else if (showHistory) {
    takeover = (
      <HistoryList
        transactions={transactions}
        services={services}
        onLogAgain={(prefill) => {
          setShowHistory(false);
          pickLogAgain(prefill);
        }}
        onClose={() => setShowHistory(false)}
      />
    );
  }

  // The main loop: totals, the upload targets, the sheet, the swipe deck.
  const mainLoop = (
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
        <DropZone busy={status === "reading"} onFiles={handleFiles} />
      )}

      {stage === "upload" && (
        <label
          // Inert while a batch is in flight, for the same reason as the drop
          // zone: a second upload mid-flight double-books the first.
          className={`block rounded-lg border border-neutral-300 px-4 py-4 text-center text-base font-medium ${
            status === "reading"
              ? "pointer-events-none opacity-50"
              : "cursor-pointer hover:bg-neutral-50"
          }`}
        >
          {/* capture jumps straight into the camera on phones. */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            disabled={status === "reading"}
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />
          Snap a receipt, check, or statement
        </label>
      )}

      {stage !== "confirm" && (
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-4 text-base font-medium hover:bg-neutral-50"
            onClick={() => setQuickAdd(true)}
          >
            Log a cash payment
          </button>
          {sorted.length > 0 && (
            <>
              <button
                type="button"
                className="rounded-lg border border-neutral-300 px-4 py-4 text-base font-medium hover:bg-neutral-50 lg:hidden"
                onClick={() => setShowHistory(true)}
              >
                History
              </button>
              <button
                type="button"
                className="rounded-lg border border-neutral-300 px-4 py-4 text-base font-medium hover:bg-neutral-50 lg:hidden"
                onClick={() => setShowDashboard(true)}
              >
                Dashboard
              </button>
            </>
          )}
        </div>
      )}

      {status === "reading" && (
        <p className="text-sm text-neutral-500">
          Reading your screenshots…{readingNote && ` (${readingNote})`}
        </p>
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
                {sorted.some((tx) => tx.direction === "out")
                  ? "All sorted. That's your money, in and out."
                  : "All sorted. That's your money in."}
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
              {accountId && !saveFailed ? (
                <p className="text-xs text-neutral-500">
                  Saved to your account. It&apos;ll be here next time you open
                  this on any device.
                </p>
              ) : accountId ? (
                // The reassurance above was printed unconditionally, including
                // right after a write that failed — so the one moment the user
                // needed to know their batch was only on screen was the one
                // moment the app told them it was safe.
                <p className="text-xs text-red-700 dark:text-red-400">
                  Some of this is on screen only — a save didn&apos;t reach your
                  account. Stay on this page and check your connection; closing
                  the tab now would lose it.
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

  // Desktop gets what the big screen is for: the flow on the left, and the
  // dashboard + history always visible in a rail — the sit-down view. On a
  // phone the rail hides and the takeover buttons do the same job.
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
      {/* Sticky so a long history in the rail scrolls past the flow instead
          of dragging it off the top of the screen. */}
      <div className="min-w-0 lg:sticky lg:top-8">{takeover ?? mainLoop}</div>
      {isDesktop && (
        <aside className="min-w-0 space-y-10 border-neutral-200 lg:border-l lg:pl-10">
          <Dashboard transactions={transactions} services={services} />
          <HistoryList
            transactions={transactions}
            services={services}
            onLogAgain={pickLogAgain}
          />
        </aside>
      )}
    </div>
  );
}
