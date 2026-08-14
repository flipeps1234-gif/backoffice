# FLOW.md — the sale flow, authoritative

This is the spec for v0.5's sale/owed/matching flow. **Any change to the
flow updates this file in the same commit.** If the code and this chart
disagree, one of them is a bug — find out which before editing either.

Two invariants the chart encodes, restated in words:

- **One payment, one sale.** An ingested transaction linked to a sale
  counts once. Ledger totals = sales + unmatched ingested business
  transactions. Never double-count across streams.
- **Recurring is expected revenue, not scheduling.** No times, no job
  reminders, no client notifications. When due it creates an OPEN sale
  in Owed — that is all it does.

```
          ┌──────────┐      ┌╌╌╌╌╌╌╌╌╌╌╌┐
          │ NEW SALE │      │ LOG AGAIN │─► jumps to PAID?,
          └────┬─────┘      └╌╌╌╌╌╌╌╌╌╌╌┘  pre-filled, 2–3 taps
               ▼
    ┌─────────────────────┐
    │ PICK PRODUCTS       │  chips · qty · running total
    └──────────┬──────────┘
               ▼                  optional toggle
    ┌─────────────────────┐    ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
    │ CHECKOUT            │╌╌╌►│ RECURRING TEMPLATE  │
    │ client (+ save?)    │    │ wkly/2wk/mo/every-N │
    │ date = today        │    │ · when due, creates │
    │ photo/notes (opt.)  │    │   an OPEN sale in   │
    └──────────┬──────────┘    │   OWED (unpaid)     │
               ▼               │ · pauses + flags    │
          ◇  PAID?  ◇          │   after 3 misses    │
         no │     │ yes        └╌╌╌╌╌╌┬╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
            │     │                   ╎ when due
            ▼     └──► ◇ CASH OR      ╎
   ┌─────────────┐     ◇ DIGITAL? ◇   ╎
   │ OWED TAB    │◄╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
   │ open sales, │   cash │      │ digital
   │ aged, per   │        │      ▼
   │ client      │        │ ┌─────────────────┐
   │ clears by:  │        │ │ MATCHING ENGINE │◄══ SCREENSHOT
   │ · cash mark │        │ │ exact amount ·  │    BATCHES
   │ · engine    │        │ │ fuzzy client ·  │  (each upload
   │   auto-match│        │ │ ±10 days ·      │   rescans OPEN
   │ 14d unpaid  │        │ │ prefers due     │   + EXPECTED)
   │  → flag     │        │ │ recurring inst. │
   └─────┬───────┘        │ └────────┬────────┘
         │                │          ▼
         │                │  ◇ ONE CLEAR MATCH? ◇
         │                │   yes │        │ no
         │                │       ▼        ▼
         │                │ ┌──────────┐ ┌──────────────┐
         │                │ │ LINKED · │ │ candidates,  │
         │                │ │ PAID     │ │ or mark      │
         │                │ │ (undo)   │ │ "EXPECTED"   │
         │                │ └────┬─────┘ └──────┬───────┘
         │                │      │              ▼
         │                │      │    ┌──────────────────┐
         │                │      │    │ EXPECTED — waits,│
         │                │      │    │ rescanned each   │
         │                │      │    │ batch. After X d │
         │                │      │    │ unmatched → FLAG │
         │                │      │    │ + resolve: wait /│
         │                │      │    │ unpaid → OWED /  │
         │                │      │    │ was cash → PAID  │
         │                │      │    └──────────────────┘
         ▼                ▼      ▼
   ┌───────────────────────────────────────┐
   │  LEDGER — every payment counted once  │
   └───────────────────────────────────────┘
```

Decisions made at build time (owner-confirmed, 2026-08-12):

- Totals **show both**: received (PAID + EXPECTED sales, plus unmatched
  ingested business income) and owed (OPEN sales) as two figures. Owed
  never enters revenue, the dashboard, or the tax CSV.
- The numpad quick-add survives for **money out only** ("Log an
  expense"). Sales handle all money in; a product-less sale uses a
  custom-amount line item.
- One card style everywhere: the new-sale picker and the products page
  share the sketch's card (name · price · cost · net margin).
- "Log again" from the homepage opens recent sales grouped by client;
  the client-first ordering exists via the Clients page. A settings tab
  choosing the default is PARKED (IDEAS.md).
- `EXPECTED_FLAG_DAYS = 14`, `RECURRING_PAUSE_AFTER_MISSES = 3`.

Review-driven decisions (2026-08-13, adversarial pass over the build):

- **Digital requires a client.** A digital sale with no client name can
  never be matched, so it would double-count as EXPECTED forever. The
  Digital button disables until a client is named; cash never needs one.
- **A "miss" is a STORED instance** still open when its successor comes
  due — instances created during one catch-up walk never count, because
  a week of not opening the app is not a missed payment. Paying any
  instance resets the counter (the module contract, now implemented).
- **Resume fast-forwards** past the paused gap; the gap generates
  nothing. Money the owner chose not to expect stays unexpected.
- **First-name clients match** full payer names by token subset
  ("Rosa" ↔ "Rosa Delgado"); the OCR edit-distance rule applies within
  tokens. The stale-EXPECTED resolve sheet gained "Find the payment…",
  which relaxes the name rule because a human is choosing from a list.
- **Instance identity is enforced by the database** (unique on
  template + due date, migration 0008) — concurrent app opens race to
  one row instead of duplicating owed.

Template management (2026-08-13 follow-up — the two controls the spec
named and the first build cut; management controls, not flow boxes, so
the chart is unchanged):

- **Edits apply to future instances only.** The template's line items are
  re-snapshotted into each instance at generation time, so changing them
  changes what tomorrow expects — never what yesterday charged. Raising
  Rosa's clean from $120 to $130 edits the template; last month's sale
  keeps last month's price. Cadence is not editable — end the old
  arrangement and make a new one; that's what actually happened.
- **End is the one-way door pause never was.** Pause freezes (and resume
  fast-forwards past the gap); End stamps `ended_on`, stops generation
  forever, offers no resume, and deletes nothing — history still points
  at the template. `endedOn` is checked independently of `active` in
  generation, so a stale `active=true` can't reanimate an ended template.

Spec-ahead-of-build: **none** as of v0.6. The `photo/notes (opt.)`
line at CHECKOUT — drawn ahead of the code on 2026-08-13 — SHIPPED the
same day: a collapsed "Add a note or photo" row at checkout, photo
compressed client-side (~≤300KB JPEG data URL, src/app/photo.ts) and
stored in the sale row (migration 0010), shown on the client's history.
Because this is the first place the app RETAINS an image, the terms
gained a block saying exactly that, and TERMS_VERSION was bumped so
every device is asked again. The chart and the code agree everywhere.

Implementation sync — checked 2026-08-13, every other box matches the
code:

- The EXPECTED resolve box lists three options for space; the code has
  a fourth, **"Find the payment…"** (documented above). The ASCII box
  abbreviates — the prose is authoritative, not a drift/bug.
- No other divergence found: NEW SALE / LOG AGAIN, PICK PRODUCTS,
  CHECKOUT (minus the v0.6 line above), PAID? → cash/digital, the
  matching engine's rules, LINKED·PAID·undo, candidates/EXPECTED, and
  the LEDGER-counts-once invariant all match what shipped.
