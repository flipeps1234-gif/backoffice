"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ClientsPage from "./clients-page";
import ConfirmationSheet from "./confirmation-sheet";
import DropZone from "./drop-zone";
import Dashboard from "./dashboard";
import HistoryList, { type LogAgainPrefill } from "./history-list";
import Insights from "./insights";
import NewSale, { type SalePrefill, type SaleResult } from "./new-sale";
import OwedTab from "./owed-tab";
import ProductsPage from "./products-page";
import RecentSales from "./recent-sales";
import ProgressBar from "./progress-bar";
import QuickAdd from "./quick-add";
import RunningTotals from "./running-totals";
import SignIn from "./sign-in";
import SwipeDeck from "./swipe-deck";
import TermsGate, { useAcceptedTerms } from "./terms-gate";
import { chunkForUpload, compressImage } from "@/lib/compress-image";
import { isSupportedImage } from "@/lib/extract/image-types";
import { knownPayers, rememberedFor } from "@/lib/customer-memory";
import type { Client } from "@/lib/client";
import { matchBatch, txnCandidatesForSale } from "@/lib/matching";
import { generateDue, type RecurringTemplate } from "@/lib/recurring";
import {
  owedCents,
  saleTotalCents,
  type PaymentMethod,
  type Sale,
} from "@/lib/sale";
import { dedupe, isDuplicate } from "@/lib/extract/dedupe";
import { warningMessage, type ExtractionWarning } from "@/lib/extract/types";
import { getSupabase } from "@/lib/supabase/client";
import {
  insertClient,
  loadClients,
  updateClient as saveClient,
} from "@/lib/supabase/clients";
import {
  insertTemplate,
  loadTemplates,
  updateTemplate as saveTemplate,
} from "@/lib/supabase/recurring";
import {
  insertSales,
  loadSales,
  updateSale as saveSale,
} from "@/lib/supabase/sales";
import {
  insertService,
  loadServices,
  updateService as saveService,
} from "@/lib/supabase/services";
import {
  insertTransactions,
  loadTransactions,
  updateTransaction as saveTransaction,
} from "@/lib/supabase/transactions";
import { useSession } from "@/lib/supabase/use-session";
import { acceptTerms, TERMS_VERSION } from "@/lib/terms";
import type { Service } from "@/lib/service";
import { formatCents, type Transaction } from "@/lib/transaction";

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

/** Local calendar date, YYYY-MM-DD — toISOString would give tomorrow for
 *  an evening save anywhere in the Americas (same rule as the numpad). */
const localToday = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** How much of the bar the compress-before-upload phase owns. */
const READY_SHARE = 0.15;

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
  /**
   * What the progress bar shows. `fraction` is null while the work is real but
   * unmeasurable — one request to a vision model reports nothing between "sent"
   * and "came back", and inventing a percentage there would be a lie.
   */
  const [progress, setProgress] = useState<{
    label: string;
    detail?: string;
    fraction: number | null;
  } | null>(null);
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

  // ---- v0.5: sales, clients, recurring (see FLOW.md) ----
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [showNewSale, setShowNewSale] = useState(false);
  /** "Log again" for SALES: prefill + a remount counter, same pattern
   *  (and same reason) as logAgainSeq above. */
  const [salePrefill, setSalePrefill] = useState<SalePrefill | null>(null);
  const [saleSeq, setSaleSeq] = useState(0);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showOwed, setShowOwed] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  /** One line of good news after a sale/match, with undo where honest. */
  const [saleNotice, setSaleNotice] = useState("");
  /** Auto-link undo: everything needed to put both sides back. */
  const [matchUndo, setMatchUndo] = useState<
    {
      saleId: string;
      txnId: string;
      prevState: Sale["state"];
      prevMethod: PaymentMethod | null;
      prevBusiness: boolean | null;
    }[]
  >([]);
  /** Ambiguous matches waiting on the owner. Never a silent guess.
   *  Payment-major from batch scans; sale-major from digital checkout. */
  const [suggestions, setSuggestions] = useState<
    (
      | { kind: "payment"; txnId: string; saleIds: string[] }
      | { kind: "sale"; saleId: string; txnIds: string[] }
    )[]
  >([]);

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

    loadClients()
      .then((rows) => {
        if (!cancelled) setClients(rows);
      })
      .catch((cause) => console.error("Clients load failed:", cause));

    // Sales and templates load together because generation needs BOTH:
    // whether an instance already exists (idempotency) and whether its
    // predecessor is still open (misses) both live in the sales list.
    Promise.all([loadSales(), loadTemplates()])
      .then(([saleRows, templateRows]) => {
        if (cancelled) return;

        // Recurring generation, on app open, with catch-up — never ahead
        // of today (src/lib/recurring.ts owns the walk; this is just I/O).
        const today = localToday();
        let allSales = saleRows;
        const nextTemplates: RecurringTemplate[] = [];
        const createdAll: Sale[] = [];
        const pausedNames: string[] = [];

        for (const template of templateRows) {
          const result = generateDue(template, allSales, today, () =>
            crypto.randomUUID(),
          );
          nextTemplates.push(result.template);
          if (result.created.length > 0) {
            // Newest-first invariant: instances prepend.
            allSales = [...result.created, ...allSales];
            createdAll.push(...result.created);
          }
          if (result.justPaused) pausedNames.push(template.clientId);
        }

        setSales(allSales);
        setTemplates(nextTemplates);
        if (createdAll.length > 0 && accountId) {
          void persist(() => insertSales(createdAll, accountId));
        }
        for (const [i, template] of templateRows.entries()) {
          const next = nextTemplates[i];
          if (
            next.nextDue !== template.nextDue ||
            next.active !== template.active ||
            next.consecutiveMisses !== template.consecutiveMisses
          ) {
            void persist(() =>
              saveTemplate(next.id, {
                nextDue: next.nextDue,
                active: next.active,
                consecutiveMisses: next.consecutiveMisses,
              }),
            );
          }
        }
        if (pausedNames.length > 0) {
          setSaleNotice(
            "A recurring sale was paused after 3 misses — check Clients.",
          );
        }
      })
      .catch((cause) => console.error("Sales load failed:", cause));

    return () => {
      cancelled = true;
    };
  }, [accountId, persist]);

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
    setProgress(null);

    // Compress in the browser first: Vercel rejects request bodies over
    // 4.5MB before our code runs, and smaller images cost less to extract.
    // Counted as it goes, so the bar moves on a slow phone chewing through
    // twenty photos rather than sitting at zero.
    let readied = 0;
    setProgress({
      label: "Getting your screenshots ready",
      detail: `${images.length} to shrink`,
      fraction: 0,
    });
    const compressed = await Promise.all(
      images.map(async (file) => {
        const out = await compressImage(file);
        readied += 1;
        setProgress({
          label: "Getting your screenshots ready",
          detail: `${readied} of ${images.length}`,
          // Compression is the quick part; it owns the first slice of the bar
          // so the long wait that follows still has most of it to travel.
          fraction: READY_SHARE * (readied / images.length),
        });
        return out;
      }),
    );

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
      setProgress({
        label: "Reading your screenshots",
        detail:
          chunks.length > 1
            ? `Batch ${index + 1} of ${chunks.length}`
            : "This is the slow bit — a few seconds.",
        // One batch is one model call: we know it started and we will know it
        // finished, and nothing in between. Say so with a moving stripe.
        fraction:
          chunks.length > 1
            ? READY_SHARE + (1 - READY_SHARE) * (index / chunks.length)
            : null,
      });
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

    setProgress(null);
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

    // FLOW.md's ═══ arrow: every confirmed batch rescans OPEN + EXPECTED.
    // AFTER confirmation, not at arrival — the user just vouched for the
    // amounts and payers, so the engine matches against checked data.
    const outcome = matchBatch(pending, sales, clients);
    if (outcome.links.length > 0) {
      setMatchUndo([]);
      for (const link of outcome.links) {
        const sale = sales.find((s) => s.id === link.saleId);
        const txn = pending.find((t) => t.id === link.txnId);
        if (sale && txn) linkSaleToTxn(sale, txn);
      }
      setSaleNotice(
        `${outcome.links.length} payment${outcome.links.length === 1 ? "" : "s"} matched to sales you'd logged.`,
      );
    }
    if (outcome.suggestions.length > 0) {
      setSuggestions((current) => [
        ...current,
        ...outcome.suggestions.map((sug) => ({
          kind: "payment" as const,
          txnId: sug.txnId,
          saleIds: sug.saleIds,
        })),
      ]);
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

  // ---- v0.5 sale plumbing ----

  const clientNameOf = (id: string | null): string =>
    clients.find((c) => c.id === id)?.name ?? "";

  /** Replace one sale in state; persistence is the caller's decision. */
  function patchSale(id: string, patch: Partial<Sale>) {
    setSales((current) =>
      current.map((sale) => (sale.id === id ? { ...sale, ...patch } : sale)),
    );
  }

  /**
   * Cash confirmed for a sale (checkout "Cash", Owed "Got cash", or the
   * EXPECTED resolve sheet). Creates the mirror TRANSACTION — the ledger,
   * dashboard and tax CSV all read the transaction stream, so a cash sale
   * without one would vanish from every total. Linked both ways at birth,
   * which is what keeps "one payment, one sale" true by construction.
   */
  function paySaleCash(sale: Sale) {
    const txn: Transaction = {
      id: crypto.randomUUID(),
      payer: clientNameOf(sale.clientId),
      amountCents: saleTotalCents(sale),
      date: sale.date,
      memo: sale.lineItems.map((i) => i.name).join(", "),
      source: "manual",
      direction: "in",
      serviceId:
        sale.lineItems.length === 1 ? sale.lineItems[0].serviceId : null,
      quantity: null,
      business: true,
      matchedSaleId: sale.id,
      confidence: {},
    };
    patchSale(sale.id, { state: "paid", method: "cash", matchedTxnId: txn.id });
    setTransactions((current) => [txn, ...current]);
    if (accountId) {
      void persist(() => insertSales([], accountId)); // keep queue ordering explicit
      void persist(() => insertTransactions([txn], accountId));
      void persist(() =>
        saveSale(sale.id, {
          state: "paid",
          method: "cash",
          matchedTxnId: txn.id,
        }),
      );
    }
  }

  /** Link one sale to one ingested transaction — the engine's yes. */
  function linkSaleToTxn(sale: Sale, txn: Transaction) {
    setMatchUndo((current) => [
      ...current,
      {
        saleId: sale.id,
        txnId: txn.id,
        prevState: sale.state,
        prevMethod: sale.method,
        prevBusiness: txn.business,
      },
    ]);
    patchSale(sale.id, {
      state: "paid",
      method: "digital",
      matchedTxnId: txn.id,
    });
    // The match IS the evidence this payment was business — it skips the
    // swipe deck. Undo puts it back exactly as it was.
    updateTransaction(txn.id, { matchedSaleId: sale.id, business: true });
    void persist(() =>
      saveSale(sale.id, {
        state: "paid",
        method: "digital",
        matchedTxnId: txn.id,
      }),
    );
    void persist(() =>
      saveTransaction(txn.id, { matchedSaleId: sale.id, business: true }),
    );
  }

  function undoMatches() {
    for (const undo of matchUndo) {
      patchSale(undo.saleId, {
        state: undo.prevState,
        method: undo.prevMethod,
        matchedTxnId: null,
      });
      updateTransaction(undo.txnId, {
        matchedSaleId: null,
        business: undo.prevBusiness,
      });
      void persist(() =>
        saveSale(undo.saleId, {
          state: undo.prevState,
          method: undo.prevMethod,
          matchedTxnId: null,
        }),
      );
      void persist(() =>
        saveTransaction(undo.txnId, {
          matchedSaleId: null,
          business: undo.prevBusiness,
        }),
      );
    }
    setMatchUndo([]);
    setSaleNotice("");
  }

  /** Everything a finished checkout hands up. See NewSale's SaleResult. */
  function handleSaleDone(
    result: SaleResult,
    paid: boolean,
    method: PaymentMethod | null,
  ) {
    setShowNewSale(false);
    setSalePrefill(null);
    setMatchUndo([]);

    // Client first: the sale (and template) reference its id, and the
    // serial write queue guarantees the insert lands before them.
    let nextClients = clients;
    if (result.newClient) {
      nextClients = [...clients, result.newClient];
      setClients(nextClients);
      if (accountId) {
        const client = result.newClient;
        void persist(() => insertClient(client, accountId));
      }
    }

    let sale = result.sale;

    if (paid && method === "cash") {
      // One mirror transaction, linked both ways — see paySaleCash.
      const txn: Transaction = {
        id: crypto.randomUUID(),
        payer: result.newClient?.name ?? clientNameOf(sale.clientId),
        amountCents: saleTotalCents(sale),
        date: sale.date,
        memo: sale.lineItems.map((i) => i.name).join(", "),
        source: "manual",
        direction: "in",
        serviceId:
          sale.lineItems.length === 1 ? sale.lineItems[0].serviceId : null,
        quantity: null,
        business: true,
        matchedSaleId: sale.id,
        confidence: {},
      };
      sale = { ...sale, state: "paid", method: "cash", matchedTxnId: txn.id };
      setTransactions((current) => [txn, ...current]);
      if (accountId) {
        void persist(() => insertTransactions([txn], accountId));
      }
      setSaleNotice(`${formatCents(saleTotalCents(sale))} — paid, done.`);
    } else if (paid && method === "digital") {
      // FLOW.md: exactly one high-confidence hit → LINKED · PAID (undo);
      // several or none → candidates + "expected in next screenshots".
      const name = result.newClient?.name ?? clientNameOf(sale.clientId);
      const candidates = txnCandidatesForSale(transactions, sale, name);
      if (candidates.length === 1) {
        const txn = candidates[0];
        sale = { ...sale, state: "paid", method: "digital", matchedTxnId: txn.id };
        setMatchUndo([
          {
            saleId: sale.id,
            txnId: txn.id,
            prevState: "expected",
            prevMethod: "digital",
            prevBusiness: txn.business,
          },
        ]);
        updateTransaction(txn.id, { matchedSaleId: sale.id, business: true });
        void persist(() =>
          saveTransaction(txn.id, { matchedSaleId: sale.id, business: true }),
        );
        setSaleNotice(
          `Matched to ${txn.payer || "a payment"} on ${txn.date || "your ledger"}.`,
        );
      } else {
        // Zero or several: the sale waits as EXPECTED, rescanned on every
        // batch. Several ALSO waits — the picker shows what it found.
        if (candidates.length > 1) {
          const saleId = sale.id;
          setSuggestions((current) => [
            ...current,
            { kind: "sale", saleId, txnIds: candidates.map((t) => t.id) },
          ]);
        }
        setSaleNotice(
          candidates.length === 0
            ? "Marked paid — we'll match it in your next screenshots."
            : `${candidates.length} payments could be this sale — pick below.`,
        );
      }
    } else {
      setSaleNotice(
        `Saved — ${result.newClient?.name ?? clientNameOf(sale.clientId) ?? "client"} owes ${formatCents(saleTotalCents(sale))}.`,
      );
    }

    // Newest-first invariant, same as transactions.
    setSales((current) => [sale, ...current]);
    if (accountId) {
      void persist(() => insertSales([sale], accountId));
    }

    if (result.template) {
      const template: RecurringTemplate = {
        ...result.template,
        id: crypto.randomUUID(),
      };
      setTemplates((current) => [...current, template]);
      if (accountId) {
        void persist(() => insertTemplate(template, accountId));
      }
    }
  }

  /**
   * History rows route by direction: money OUT re-opens the numpad (its
   * only remaining job), money IN becomes a sale prefill — one custom
   * line holding the amount, the payer as client. The old income numpad
   * path is gone on purpose: sales own money in now.
   */
  function routeLogAgain(prefill: LogAgainPrefill) {
    if (prefill.direction === "out") {
      pickLogAgain(prefill);
      return;
    }
    const service = services.find((svc) => svc.id === prefill.serviceId);
    setSalePrefill({
      lineItems: [
        {
          serviceId: prefill.serviceId,
          name: service?.name ?? "Payment",
          quantity: 1,
          unitCents: prefill.amountCents,
          unitCostCents: service?.costCents ?? null,
        },
      ],
      clientName: prefill.payer,
    });
    setSaleSeq((n) => n + 1);
    setShowNewSale(true);
  }

  /** "Log again" for a sale: prefill, jump straight to PAID?. */
  function pickSaleAgain(sale: Sale) {
    setSalePrefill({
      lineItems: sale.lineItems.map((item) => ({ ...item })),
      clientName: clientNameOf(sale.clientId),
    });
    setSaleSeq((n) => n + 1);
    setShowRecentSales(false);
    setShowOwed(false);
    setShowClients(false);
    setShowNewSale(true);
  }

  const pending = transactions.filter((tx) => tx.business === null);
  const sorted = transactions.filter((tx) => tx.business !== null);
  const lastBatch = transactions.filter((tx) => lastBatchIds.includes(tx.id));

  // The flow column shows exactly one thing at a time: a takeover — the
  // numpad, or (on phones only, where there's no rail) history/dashboard —
  // and otherwise the main loop below. null means "nothing took over".
  let takeover: React.ReactNode = null;
  if (showNewSale) {
    takeover = (
      <NewSale
        key={`sale-${saleSeq}`}
        services={services}
        clients={clients}
        prefill={salePrefill ?? undefined}
        onDone={handleSaleDone}
        onClose={() => {
          setShowNewSale(false);
          setSalePrefill(null);
        }}
      />
    );
  } else if (showRecentSales) {
    takeover = (
      <RecentSales
        sales={sales}
        clients={clients}
        onPick={pickSaleAgain}
        onClose={() => setShowRecentSales(false)}
      />
    );
  } else if (showOwed) {
    takeover = (
      <OwedTab
        sales={sales}
        clients={clients}
        onMarkCash={(saleId) => {
          const sale = sales.find((s) => s.id === saleId);
          if (sale) paySaleCash(sale);
        }}
        onMoveToOwed={(saleId) => {
          patchSale(saleId, { state: "open", method: null });
          void persist(() => saveSale(saleId, { state: "open", method: null }));
        }}
        onLogAgain={pickSaleAgain}
        onClose={() => setShowOwed(false)}
      />
    );
  } else if (showClients) {
    takeover = (
      <ClientsPage
        clients={clients}
        sales={sales}
        templates={templates}
        onUpdateClient={(id, patch) => {
          setClients((current) =>
            current.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          );
          void persist(() => saveClient(id, patch));
        }}
        onUpdateTemplate={(id, patch) => {
          setTemplates((current) =>
            current.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          );
          void persist(() => saveTemplate(id, patch));
        }}
        onLogAgain={pickSaleAgain}
        onClose={() => setShowClients(false)}
      />
    );
  } else if (showProducts) {
    takeover = (
      <ProductsPage
        services={services}
        onCreate={(service) => {
          setServices((current) => [...current, service]);
          if (accountId) {
            void persist(() => insertService(service, accountId));
          }
        }}
        onUpdate={(service) => {
          setServices((current) =>
            current.map((old) => (old.id === service.id ? service : old)),
          );
          void persist(() => saveService(service));
        }}
        onClose={() => setShowProducts(false)}
      />
    );
  } else if (quickAdd || logAgain) {
    takeover = (
      <QuickAdd
        key={`quick-add-${logAgainSeq}`}
        services={services}
        expense={!logAgain}
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
          routeLogAgain(prefill);
        }}
        onClose={() => setShowHistory(false)}
      />
    );
  }

  // The main loop: totals, the upload targets, the sheet, the swipe deck.
  const mainLoop = (
    <div className="space-y-6">
      {(stage === "sort" || sorted.length > 0 || sales.length > 0) && (
        <RunningTotals
          transactions={transactions}
          expectedCents={sales
            .filter((s) => s.state === "expected")
            .reduce((sum, s) => sum + saleTotalCents(s), 0)}
          owedCents={owedCents(sales)}
        />
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

      {status === "reading" && progress && (
        <ProgressBar
          label={progress.label}
          detail={progress.detail}
          fraction={progress.fraction}
        />
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
        <div className="space-y-3">
          {/* Separate but connected, new sale on top — the owner's spec.
              One frame, shared border, divided; two distinct buttons. */}
          <div className="overflow-hidden rounded-xl border border-neutral-400 dark:border-neutral-600">
            <button
              type="button"
              className="block w-full bg-foreground px-4 py-4 text-base font-semibold text-background hover:opacity-90"
              onClick={() => {
                setSalePrefill(null);
                setSaleSeq((n) => n + 1);
                setShowNewSale(true);
              }}
            >
              New sale
            </button>
            <button
              type="button"
              className="block w-full border-t border-neutral-400 px-4 py-3 text-base font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-900"
              onClick={() => setShowRecentSales(true)}
            >
              Log again
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
              onClick={() => setShowProducts(true)}
            >
              Products &amp; services
            </button>
            <button
              type="button"
              className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
              onClick={() => setShowClients(true)}
            >
              Clients
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
              onClick={() => setQuickAdd(true)}
            >
              Log an expense
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
              onClick={() => setShowOwed(true)}
            >
              Owed
              {owedCents(sales) > 0 && (
                <span className="ml-1 tabular-nums text-amber-700 dark:text-amber-400">
                  {formatCents(owedCents(sales))}
                </span>
              )}
            </button>
            {sorted.length > 0 && (
              <>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 lg:hidden"
                  onClick={() => setShowHistory(true)}
                >
                  History
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 lg:hidden"
                  onClick={() => setShowDashboard(true)}
                >
                  Dashboard
                </button>
              </>
            )}
          </div>
        </div>
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

      {saleNotice && (
        <p
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          <span>{saleNotice}</span>
          {matchUndo.length > 0 && (
            <button
              type="button"
              className="shrink-0 font-medium underline"
              onClick={undoMatches}
            >
              Undo
            </button>
          )}
          {matchUndo.length === 0 && (
            <button
              type="button"
              aria-label="Dismiss"
              className="shrink-0 font-medium"
              onClick={() => setSaleNotice("")}
            >
              ×
            </button>
          )}
        </p>
      )}

      {suggestions.map((sug) => {
        // Ambiguity is resolved by a human, never a guess. Each entry
        // pairs one side with its candidates; a tap links, "None" drops.
        const isPayment = sug.kind === "payment";
        const txnOf = (id: string) => transactions.find((t) => t.id === id);
        const saleOf = (id: string) => sales.find((sl) => sl.id === id);
        const anchor = isPayment ? txnOf(sug.txnId) : saleOf(sug.saleId);
        if (!anchor) return null;
        const dismiss = () =>
          setSuggestions((current) => current.filter((x) => x !== sug));
        return (
          <div
            key={isPayment ? `p-${sug.txnId}` : `s-${sug.saleId}`}
            className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            <p>
              {isPayment
                ? `A ${formatCents((anchor as Transaction).amountCents)} payment from ${(anchor as Transaction).payer || "someone"} could be one of these sales:`
                : `This ${formatCents(saleTotalCents(anchor as Sale))} sale could match one of these payments:`}
            </p>
            <div className="flex flex-wrap gap-2">
              {(isPayment ? sug.saleIds : sug.txnIds).map((otherId) => {
                const sale = isPayment
                  ? saleOf(otherId)
                  : (anchor as Sale);
                const txn = isPayment
                  ? (anchor as Transaction)
                  : txnOf(otherId);
                if (!sale || !txn) return null;
                return (
                  <button
                    key={otherId}
                    type="button"
                    className="rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs font-medium"
                    onClick={() => {
                      linkSaleToTxn(sale, txn);
                      setSaleNotice("Matched.");
                      dismiss();
                    }}
                  >
                    {isPayment
                      ? `${clientNameOf(sale.clientId) || "Sale"} · ${sale.date}`
                      : `${txn.payer || "Payment"} · ${txn.date || "no date"}`}
                  </button>
                );
              })}
              <button
                type="button"
                className="rounded-md px-2 py-1.5 text-xs font-medium underline"
                onClick={dismiss}
              >
                None of these
              </button>
            </div>
          </div>
        );
      })}

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
          <OwedTab
            sales={sales}
            clients={clients}
            onMarkCash={(saleId) => {
              const sale = sales.find((sl) => sl.id === saleId);
              if (sale) paySaleCash(sale);
            }}
            onMoveToOwed={(saleId) => {
              patchSale(saleId, { state: "open", method: null });
              void persist(() =>
                saveSale(saleId, { state: "open", method: null }),
              );
            }}
            onLogAgain={pickSaleAgain}
          />
          <Dashboard transactions={transactions} services={services} />
          <HistoryList
            transactions={transactions}
            services={services}
            onLogAgain={routeLogAgain}
          />
        </aside>
      )}
    </div>
  );
}
