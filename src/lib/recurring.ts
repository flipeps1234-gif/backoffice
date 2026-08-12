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
  if (!template.active) {
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

  // Hard ceiling so a corrupted nextDue years in the past cannot generate
  // thousands of rows. 120 covers two years of weekly catch-up.
  for (let step = 0; step < 120 && nextDue <= today; step += 1) {
    // The previous instance (stored OR created this walk) still OPEN when
    // this one generates = one miss. Payment resets the count elsewhere.
    const previousStillOpen =
      mine.some((s) => s.state === "open" && s.date < nextDue) ||
      created.some((s) => s.state === "open" && s.date < nextDue);
    if (created.length > 0 || mine.length > 0) {
      if (previousStillOpen) {
        misses += 1;
        if (misses >= RECURRING_PAUSE_AFTER_MISSES) {
          active = false;
          justPaused = true;
          break; // paused: this due date is NOT created
        }
      }
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
