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
    └──────────┬──────────┘    │   an OPEN sale in   │
               ▼               │   OWED (unpaid)     │
          ◇  PAID?  ◇          │ · pauses + flags    │
         no │     │ yes        │   after 3 misses    │
            │     │            └╌╌╌╌╌╌┬╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
            ▼     └──► ◇ CASH OR      ╎ when due
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
