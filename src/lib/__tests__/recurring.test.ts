import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  RECURRING_PAUSE_AFTER_MISSES,
  advance,
  cadenceLabel,
  fastForwardPastGap,
  generateDue,
  type Cadence,
  type RecurringTemplate,
} from "../recurring";
import { isoDateArb, item, sale } from "./arbitraries";

/**
 * LAW 6 — recurring templates are EXPECTED REVENUE, not scheduling.
 *
 * Generation walks the due date forward one cadence step at a time, never
 * past today, creating one OPEN sale per date it passes. The miss counter
 * is the safety valve: three consecutive unpaid instances and the template
 * pauses itself rather than filling the Owed tab with money nobody owes.
 * "Exactly three" is the whole point of the number, so the boundary is
 * tested at two, three and four.
 */

const template = (over: Partial<RecurringTemplate> = {}): RecurringTemplate => ({
  id: "tpl-1",
  clientId: "client-1",
  lineItems: [item({ unitCents: 6_000 })],
  cadence: { type: "weekly" },
  nextDue: "2026-07-01",
  active: true,
  consecutiveMisses: 0,
  endedOn: null,
  ...over,
});

/** Instance ids that say which call made them, so tests can point at one. */
const ids = () => {
  let n = 0;
  return () => `gen-${(n += 1)}`;
};

const instance = (date: string, state: "open" | "expected" | "paid") =>
  sale({ id: `stored-${date}`, date, state, recurringTemplateId: "tpl-1" });

describe("the cadence date math is UTC, so no timezone can shift a due date", () => {
  it("steps a week and a fortnight exactly", () => {
    expect(advance("2026-07-01", { type: "weekly" })).toBe("2026-07-08");
    expect(advance("2026-07-01", { type: "biweekly" })).toBe("2026-07-15");
  });

  it("steps across a month, a year and a leap day without losing a day", () => {
    expect(advance("2026-02-26", { type: "weekly" })).toBe("2026-03-05");
    expect(advance("2026-12-28", { type: "weekly" })).toBe("2027-01-04");
    expect(advance("2024-02-26", { type: "weekly" })).toBe("2024-03-04");
  });

  it("steps across both US daylight-saving switches without drifting an hour into another day", () => {
    // DST begins 2026-03-08 and ends 2026-11-01 in the US.
    expect(advance("2026-03-07", { type: "weekly" })).toBe("2026-03-14");
    expect(advance("2026-10-31", { type: "weekly" })).toBe("2026-11-07");
    expect(advance("2026-03-07", { type: "everyN", days: 1 })).toBe("2026-03-08");
    expect(advance("2026-11-01", { type: "everyN", days: 1 })).toBe("2026-11-02");
  });

  it("clamps a monthly step to the target month's last day instead of sliding into the next month", () => {
    expect(advance("2026-01-31", { type: "monthly" })).toBe("2026-02-28");
    expect(advance("2024-01-31", { type: "monthly" })).toBe("2024-02-29");
    expect(advance("2026-08-31", { type: "monthly" })).toBe("2026-09-30");
    expect(advance("2026-12-31", { type: "monthly" })).toBe("2027-01-31");
  });

  it("keeps the clamped day from then on — one day of drift, never a skipped month", () => {
    const feb = advance("2026-01-31", { type: "monthly" });
    expect(feb).toBe("2026-02-28");
    expect(advance(feb, { type: "monthly" })).toBe("2026-03-28");
  });

  it("refuses to stand still on a malformed everyN, which would loop forever", () => {
    expect(advance("2026-07-01", { type: "everyN", days: 0 })).toBe("2026-07-02");
    expect(advance("2026-07-01", { type: "everyN", days: -5 })).toBe("2026-07-02");
    expect(advance("2026-07-01", { type: "everyN", days: 0.4 })).toBe("2026-07-02");
    expect(advance("2026-07-01", { type: "everyN", days: 1.6 })).toBe("2026-07-03");
  });

  it("always moves strictly forward, whatever the date and cadence", () => {
    const cadenceArb = fc.oneof(
      fc.constant<Cadence>({ type: "weekly" }),
      fc.constant<Cadence>({ type: "biweekly" }),
      fc.constant<Cadence>({ type: "monthly" }),
      fc
        .integer({ min: -5, max: 400 })
        .map((days): Cadence => ({ type: "everyN", days })),
    );
    fc.assert(
      fc.property(isoDateArb, cadenceArb, (due, cadence) => {
        const next = advance(due, cadence);
        expect(next).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(next > due).toBe(true);
      }),
      { numRuns: 1_000 },
    );
  });

  it("names every cadence, including the singular day", () => {
    expect(cadenceLabel({ type: "weekly" })).toBe("Every week");
    expect(cadenceLabel({ type: "everyN", days: 1 })).toBe("Every 1 day");
    expect(cadenceLabel({ type: "everyN", days: 10 })).toBe("Every 10 days");
  });
});

describe("catch-up generation", () => {
  it("creates one open instance per due date it passes, oldest first", () => {
    const result = generateDue(template(), [], "2026-07-22", ids());
    expect(result.created.map((s) => s.date)).toEqual([
      "2026-07-01",
      "2026-07-08",
      "2026-07-15",
      "2026-07-22",
    ]);
    expect(result.created.every((s) => s.state === "open")).toBe(true);
    expect(result.created.every((s) => s.recurringTemplateId === "tpl-1")).toBe(true);
    expect(result.template.nextDue).toBe("2026-07-29");
  });

  it("never generates ahead of today", () => {
    fc.assert(
      fc.property(isoDateArb, (today) => {
        const result = generateDue(
          template({ nextDue: "2026-01-01" }),
          [],
          today,
          ids(),
        );
        for (const created of result.created) {
          expect(created.date <= today).toBe(true);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("creates nothing at all when the next instance is still in the future", () => {
    const result = generateDue(template({ nextDue: "2026-08-01" }), [], "2026-07-22", ids());
    expect(result.created).toEqual([]);
    expect(result.template.nextDue).toBe("2026-08-01");
  });

  it("creates the instance due exactly today", () => {
    const result = generateDue(template({ nextDue: "2026-07-01" }), [], "2026-07-01", ids());
    expect(result.created.map((s) => s.date)).toEqual(["2026-07-01"]);
  });

  it("is idempotent — opening the app twice on the same day does not duplicate an instance", () => {
    const first = generateDue(template(), [], "2026-07-15", ids());
    const second = generateDue(first.template, first.created, "2026-07-15", ids());
    expect(second.created).toEqual([]);
    expect(second.template.nextDue).toBe(first.template.nextDue);
  });

  it("skips a date that already has a stored instance rather than minting a second one", () => {
    const result = generateDue(
      template(),
      [instance("2026-07-08", "paid")],
      "2026-07-15",
      ids(),
    );
    expect(result.created.map((s) => s.date)).toEqual([
      "2026-07-01",
      "2026-07-15",
    ]);
  });

  it("gives each instance its own copy of the line items, so later template edits do not rewrite history", () => {
    const tpl = template();
    const result = generateDue(tpl, [], "2026-07-08", ids());
    expect(result.created[0].lineItems).toEqual(tpl.lineItems);
    expect(result.created[0].lineItems[0]).not.toBe(tpl.lineItems[0]);
  });

  it("gives a fresh instance no proof-of-work, because the visit has not happened", () => {
    const result = generateDue(template(), [], "2026-07-01", ids());
    expect(result.created[0].notes).toBe("");
    expect(result.created[0].photo).toBeNull();
    expect(result.created[0].method).toBeNull();
    expect(result.created[0].matchedTxnId).toBeNull();
  });

  it("stops at a hard ceiling so a corrupted date years in the past cannot mint thousands of rows", () => {
    const result = generateDue(
      template({ nextDue: "2015-01-01" }),
      [],
      "2026-08-14",
      ids(),
    );
    expect(result.created.length).toBeLessThanOrEqual(120);
    expect(result.created.length).toBe(120);
  });
});

describe("miss counting and the pause at exactly three", () => {
  it("counts one miss when the last stored instance is still open", () => {
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 0 }),
      [instance("2026-07-01", "open")],
      "2026-07-08",
      ids(),
    );
    expect(result.template.consecutiveMisses).toBe(1);
    expect(result.justPaused).toBe(false);
    expect(result.template.active).toBe(true);
    expect(result.created).toHaveLength(1);
  });

  it("does not pause on the second miss", () => {
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 1 }),
      [instance("2026-07-01", "open")],
      "2026-07-08",
      ids(),
    );
    expect(result.template.consecutiveMisses).toBe(2);
    expect(result.justPaused).toBe(false);
    expect(result.template.active).toBe(true);
    expect(result.created).toHaveLength(1);
  });

  it("pauses on exactly the third miss, and does not create that instance", () => {
    expect(RECURRING_PAUSE_AFTER_MISSES).toBe(3);
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 2 }),
      [instance("2026-07-01", "open")],
      "2026-07-08",
      ids(),
    );
    expect(result.template.consecutiveMisses).toBe(3);
    expect(result.justPaused).toBe(true);
    expect(result.template.active).toBe(false);
    expect(result.created).toEqual([]);
  });

  it("leaves the due date where it was when it pauses, so nothing is silently skipped", () => {
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 2 }),
      [instance("2026-07-01", "open")],
      "2026-07-29",
      ids(),
    );
    expect(result.template.nextDue).toBe("2026-07-08");
  });

  it("counts a single lingering instance once per walk, however long the catch-up", () => {
    // Three weeks away from the app with one unpaid instance behind: that is
    // one miss, not three. Punishing a holiday is not what "missed" means.
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 0 }),
      [instance("2026-07-01", "open")],
      "2026-07-29",
      ids(),
    );
    expect(result.template.consecutiveMisses).toBe(1);
    expect(result.created.map((s) => s.date)).toEqual([
      "2026-07-08",
      "2026-07-15",
      "2026-07-22",
      "2026-07-29",
    ]);
  });

  it("never counts an instance it created during this very walk as missed", () => {
    const result = generateDue(
      template({ nextDue: "2026-07-01", consecutiveMisses: 0 }),
      [],
      "2026-08-19",
      ids(),
    );
    expect(result.template.consecutiveMisses).toBe(0);
    expect(result.template.active).toBe(true);
  });

  it("resets the count to zero when the last instance was paid", () => {
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 2 }),
      [instance("2026-07-01", "paid")],
      "2026-07-08",
      ids(),
    );
    expect(result.template.consecutiveMisses).toBe(0);
    expect(result.template.active).toBe(true);
    expect(result.created).toHaveLength(1);
  });

  // CURRENT BEHAVIOR, and worth knowing: EXPECTED is neither a miss nor a
  // payment here. The owner has SAID it was paid but no transaction has
  // corroborated it, so the counter simply holds where it was.
  it("neither counts nor forgives an instance that is merely expected", () => {
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 2 }),
      [instance("2026-07-01", "expected")],
      "2026-07-08",
      ids(),
    );
    expect(result.template.consecutiveMisses).toBe(2);
    expect(result.template.active).toBe(true);
    expect(result.created).toHaveLength(1);
  });

  it("pauses immediately when a stale row left the counter at or above the threshold", () => {
    const result = generateDue(
      template({ nextDue: "2026-07-08", consecutiveMisses: 5 }),
      [instance("2026-07-01", "open")],
      "2026-07-08",
      ids(),
    );
    expect(result.justPaused).toBe(true);
    expect(result.template.active).toBe(false);
    expect(result.created).toEqual([]);
  });

  it("never reports a pause without actually pausing, or the reverse", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        fc.constantFrom("open" as const, "paid" as const, "expected" as const),
        isoDateArb,
        (misses, state, today) => {
          const result = generateDue(
            template({ nextDue: "2026-07-08", consecutiveMisses: misses }),
            [instance("2026-07-01", state)],
            today,
            ids(),
          );
          if (result.justPaused) expect(result.template.active).toBe(false);
          if (result.template.active) expect(result.justPaused).toBe(false);
          expect(result.template.consecutiveMisses).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("the one-way doors", () => {
  it("generates nothing for a paused template, and hands the very same template back", () => {
    const paused = template({ active: false });
    const result = generateDue(paused, [], "2026-08-14", ids());
    expect(result.created).toEqual([]);
    expect(result.template).toBe(paused);
    expect(result.justPaused).toBe(false);
  });

  it("generates nothing for an ended template even if a stale row left it marked active", () => {
    const result = generateDue(
      template({ active: true, endedOn: "2026-06-30" }),
      [],
      "2026-08-14",
      ids(),
    );
    expect(result.created).toEqual([]);
    expect(result.template.nextDue).toBe("2026-07-01");
  });

  it("hands back the template untouched when it refuses to run", () => {
    const ended = template({ endedOn: "2026-06-30" });
    const result = generateDue(ended, [], "2026-08-14", ids());
    expect(result.template).toEqual(ended);
  });
});

describe("resuming after a pause skips the gap instead of back-filling it", () => {
  it("fast-forwards the due date to the first one that is not in the past", () => {
    const paused = template({ nextDue: "2026-01-07", active: false });
    const resumed = fastForwardPastGap(paused, "2026-08-14");
    expect(resumed >= "2026-08-14").toBe(true);
    expect(resumed).toBe("2026-08-19");
  });

  it("leaves a due date that is already today or later exactly where it is", () => {
    expect(fastForwardPastGap(template({ nextDue: "2026-08-14" }), "2026-08-14")).toBe(
      "2026-08-14",
    );
    expect(fastForwardPastGap(template({ nextDue: "2026-09-01" }), "2026-08-14")).toBe(
      "2026-09-01",
    );
  });

  it("generates nothing at all after a resume, which is the entire point", () => {
    const paused = template({ nextDue: "2026-01-07", active: false });
    const resumed = template({ nextDue: fastForwardPastGap(paused, "2026-08-14"), active: true });
    expect(generateDue(resumed, [], "2026-08-14", ids()).created).toEqual([]);
  });

  it("stops at the same hard ceiling as the walk", () => {
    const ancient = template({ nextDue: "2010-01-01", active: false });
    const forwarded = fastForwardPastGap(ancient, "2026-08-14");
    // 120 weekly steps from 2010 does not reach 2026 — the ceiling wins, and
    // the caller is left with a date that is still in the past rather than a
    // hung loop.
    expect(forwarded).toBe("2012-04-20");
  });
});
