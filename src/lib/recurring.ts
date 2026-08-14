import type { LineItem, Sale } from "./sale";

/**
 * Recurring templates — EXPECTED REVENUE, NOT SCHEDULING. The rule from
 * CLAUDE.md verbatim: no times, no job reminders, no client notifications.
 * All a template does is create an OPEN sale in Owed when it comes due,
 * so money the owner expects shows up as money not yet received.
 *
 * Generation runs on app open (there is no server-side clock on this
 * stack), catches up on missed days one instance at a time, and NEVER
 * generates ahead of today.
 */

export type Cadence =
  | { type: "weekly" }
  | { type: "biweekly" }
  | { type: "monthly" }
  | { type: "everyN"; days: number };

export type RecurringTemplate = {
  id: string;
  clientId: string;
  lineItems: LineItem[];
  cadence: Cadence;
  /** YYYY-MM-DD of the next instance to create. Anchored on the sale that
   *  created the template; advances one cadence step per instance. */
  nextDue: string;
  active: boolean;
  /** Instances still OPEN when their successor generated. Resets on any
   *  payment; at RECURRING_PAUSE_AFTER_MISSES the template pauses itself. */
  consecutiveMisses: number;
  /** YYYY-MM-DD the owner explicitly ended it, or null. End is the one-way
   *  door pause never was: no resume, no more instances, history untouched.
   *  Kept separate from `active` so an ended template can never be nagged
   *  about ("3 missed — still active?") or accidentally resumed. */
  endedOn: string | null;
};

export const RECURRING_PAUSE_AFTER_MISSES = 3;

export const CADENCE_LABELS: Record<Cadence["type"], string> = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
  everyN: "Every N days",
};

export const cadenceLabel = (cadence: Cadence): string =>
  cadence.type === "everyN"
    ? `Every ${cadence.days} day${cadence.days === 1 ? "" : "s"}`
    : CADENCE_LABELS[cadence.type];

// ---- date math, all in UTC so a timezone can never shift a due date ----

const toUtc = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (iso: string, days: number): string => {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
};

/**
 * Monthly keeps the anchor day-of-month, clamped to the target month's
 * length — the 31st becomes Feb 29/28 rather than sliding into March and
 * then drifting one month late forever after. The anchor day is taken from
 * the CURRENT due date's day; a Jan 31 template goes Feb 28 → Mar 28, which
 * trades one day of drift for never skipping a month. Documented trade-off:
 * the alternative (remembering the original anchor separately) needs another
 * column for a case that barely occurs in this product's world.
 */
const addMonthClamped = (iso: string): string => {
  const d = toUtc(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toIso(target);
};

export const advance = (due: string, cadence: Cadence): string => {
  switch (cadence.type) {
    case "weekly":
      return addDays(due, 7);
    case "biweekly":
      return addDays(due, 14);
    case "monthly":
      return addMonthClamped(due);
    case "everyN":
      // A malformed N would loop forever below; clamp to at least 1 day.
      return addDays(due, Math.max(1, Math.round(cadence.days)));
  }
};

export type GenerationResult = {
  /** New OPEN sales to append, oldest first (each tagged with the template). */
  created: Sale[];
  /** The template with nextDue advanced, misses counted, possibly paused. */
  template: RecurringTemplate;
  /** True when this run crossed the miss threshold and paused the template —
   *  the caller shows "3 missed — still active?" on the client. */
  justPaused: boolean;
};

/**
 * Catch-up generation for one template. Walks nextDue forward one cadence
 * step at a time until it passes `today`, creating an OPEN sale per due
 * date. Misses are counted the way the spec words it: an instance still
 * OPEN when the NEXT one generates increments consecutiveMisses; at the
 * threshold the template pauses mid-walk and stops creating instances.
 *
 * `existingSales` is consulted so generation is idempotent — reopening the
 * app twice on the same day must not create the same instance twice. The
 * identity of an instance is (template, due date).
 *
 * `makeId` is injected because src/lib stays pure: no crypto, no clock.
 */
export const generateDue = (
  template: RecurringTemplate,
  existingSales: Sale[],
  today: string,
  makeId: () => string,
): GenerationResult => {
  // `endedOn` is checked independently of `active` on purpose: an ended
  // template must stay dead even if a stale write or hand-edited row left
  // active=true behind. Belt and braces around a one-way door.
  if (!template.active || template.endedOn !== null) {
    return { created: [], template, justPaused: false };
  }

  const mine = existingSales.filter(
    (s) => s.recurringTemplateId === template.id,
  );
  const created: Sale[] = [];
  let nextDue = template.nextDue;
  let misses = template.consecutiveMisses;
  let active = true;
  let justPaused = false;
  /** Each STORED instance counts as at most one miss per walk — a single
   *  lingering unpaid instance must not ratchet the counter to the pause
   *  threshold inside one catch-up. */
  const counted = new Set<string>();

  // Hard ceiling so a corrupted nextDue years in the past cannot generate
  // thousands of rows. 120 covers two years of weekly catch-up.
  for (let step = 0; step < 120 && nextDue <= today; step += 1) {
    // A miss is a STORED instance — one that existed before this walk and
    // the owner has actually seen — still OPEN when its successor comes
    // due. Instances created during THIS walk never count: the owner was
    // simply away, nothing could have been paid, and punishing a week of
    // not opening the app is not what "missed" means. A PAID most-recent
    // predecessor resets the count, which is the module contract
    // ("resets on any payment") applied inside the walk; the app layer
    // also resets the stored counter the moment a payment lands.
    const prior = mine
      .filter((s) => s.date < nextDue)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (prior && prior.state === "open") {
      if (!counted.has(prior.id)) {
        counted.add(prior.id);
        misses += 1;
        if (misses >= RECURRING_PAUSE_AFTER_MISSES) {
          active = false;
          justPaused = true;
          break; // paused: this due date is NOT created
        }
      }
    } else if (prior && prior.state === "paid") {
      misses = 0;
    }

    const alreadyExists = mine.some((s) => s.date === nextDue);
    if (!alreadyExists) {
      created.push({
        id: makeId(),
        clientId: template.clientId,
        // Snapshot the template's items again per instance — the template
        // may be edited later, and edits apply to FUTURE instances only.
        lineItems: template.lineItems.map((item) => ({ ...item })),
        date: nextDue,
        state: "open",
        method: null,
        matchedTxnId: null,
        recurringTemplateId: template.id,
        // Fresh instances carry no proof-of-work — the photo/note belong
        // to a specific visit, and this visit hasn't happened yet.
        notes: "",
        photo: null,
      });
    }
    nextDue = advance(nextDue, template.cadence);
  }

  return {
    created,
    template: {
      ...template,
      nextDue,
      consecutiveMisses: misses,
      active,
    },
    justPaused,
  };
};

/**
 * The resume half of pause/resume. Pausing freezes nothing — nextDue stays
 * where it was — so resuming after a long gap would make generateDue
 * back-fill the entire paused period as OPEN sales the client never owed,
 * then re-pause itself on those very creations. A paused gap is money the
 * owner CHOSE not to expect; fast-forward past it, generating nothing.
 * Same 120-step ceiling as the walk, for the same corrupted-date reason.
 */
export const fastForwardPastGap = (
  template: RecurringTemplate,
  today: string,
): string => {
  let due = template.nextDue;
  for (let step = 0; step < 120 && due < today; step += 1) {
    due = advance(due, template.cadence);
  }
  return due;
};
