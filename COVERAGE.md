# COVERAGE.md — src/lib, measured

```bash
npm run test:engine -- --coverage
```

```
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   99.01 |    94.01 |   99.23 |   99.57 |
 lib               |   99.16 |    93.53 |   99.11 |   99.62 |
  csv.ts           |   98.57 |    87.09 |     100 |   98.33 | 258
  ...mer-memory.ts |     100 |     91.3 |     100 |     100 | 41
  dashboard.ts     |   98.27 |      100 |    90.9 |     100 |
  locale.ts        |   97.43 |    89.47 |     100 |     100 | 19-20
  markdown.ts      |     100 |    93.75 |     100 |     100 | 28-29
  matching.ts      |   98.86 |    96.22 |     100 |     100 | 137-138
  recommend.ts     |   96.66 |       80 |     100 |     100 | ...,90,99,101-103
  recurring.ts     |   98.43 |    93.75 |    92.3 |    98.3 | 160
  sale.ts          |     100 |    97.56 |     100 |     100 | 168
  seo.ts           |     100 |    83.33 |     100 |     100 | 50,149
  settings.ts      |   98.36 |    92.85 |     100 |   98.21 | 44
  site.ts          |     100 |       75 |     100 |     100 | 25
  terms.ts         |     100 |    83.33 |     100 |     100 | 68
 lib/extract       |   98.52 |    97.05 |     100 |     100 |
  dedupe.ts        |   97.82 |    96.66 |     100 |     100 | 36
  mock.ts          |     100 |    94.44 |     100 |     100 | 67
  validate.ts      |   97.95 |    97.82 |     100 |     100 | 52
 lib/notify        |   96.15 |     92.3 |     100 |   95.83 |
  store.ts         |   83.33 |       75 |     100 |      80 | 16
-------------------|---------|----------|---------|---------|-------------------

Statements   : 99.01% ( 1108/1119 )
Branches     : 94.01% (  675/718  )
Functions    : 99.23% (  261/263  )
Lines        : 99.57% (  942/946  )
```

**Statements are at 99.01%, against the brief's bar of 90%.** Files not
listed in the table are at 100% on every metric — that includes every
module the money actually flows through: `transaction.ts`, `service.ts`,
`client.ts`, `insights.ts`, `mileage.ts`, `setaside.ts`, `recap.ts`,
`history.ts`, `search.ts`, `category.ts`, `profile.ts`, `invoice.ts`,
`i18n.ts`, `faq.ts`, `help.ts`, `version.ts`, `extract/index.ts`,
`extract/image-types.ts`, `notify/types.ts`, `notify/cap.ts` and
`notify/sms-templates.ts`.

## What is excluded from the measurement, and why

Set in `vitest.config.mts`. Four modules are out of scope because they
cannot run without a network or a browser, and stubbing them would test
the stub:

| Excluded | Why |
| --- | --- |
| `extract/openai.ts` | Calls the OpenAI vision endpoint. Its output is validated by `extract/validate.ts`, which is at 98% — the guard against a model returning nonsense is tested; the HTTP call is not. |
| `compress-image.ts` | Browser `Canvas`/`createImageBitmap`. No DOM in this suite. |
| `notify/sms.ts`, `notify/whatsapp.ts` | Provider HTTP clients for a spike that is dark in production (`WHATSAPP_ENABLED` is false). The pure parts of that subsystem — the frequency cap, the templates, the consent record — are tested at 96–100%. |
| `supabase/*` | Client construction and typed table wrappers. Persistence, not engine. |
| `messages/**`, `extract/types.ts` | Data and type declarations: 714 translation strings and a handful of `type` aliases, no branches to exercise. The dictionary is nonetheless checked structurally in `content-modules.test.ts` — every key carries all three languages. |

## The 11 uncovered statements, one by one

Nothing here is untestable in principle; each is a defensive branch whose
trigger the module's own types make unreachable from checked code.

- **`csv.ts:258`** — the `profile && hasProfile(profile)` guard on the
  everything-export's profile section, in the arm where a caller passes a
  profile object that is entirely empty. Both outcomes are covered through
  `taxCsv`; this is the same guard reached by the other export.
- **`customer-memory.ts:41`** — the `(b.date || "")` fallback inside the
  sort comparator, for a stored row with an empty date. Reachable only if a
  transaction is saved with no date, which the sale flow prevents.
- **`dashboard.ts`** — one arrow function in a comparator that never sees
  the specific tie shape; `marginByService`'s branches are at 100%.
- **`locale.ts:19-20`** — the `typeof navigator === "undefined"` server-side
  branch. The tests always stub a navigator, because the module is only
  ever imported in a client component.
- **`markdown.ts:28-29`** — `match.index ?? 0`, where `String.matchAll`
  guarantees `index` is present.
- **`matching.ts:137-138`** — the `?? ""` when a sale's `clientId` points at
  a client that is not in the directory. `outstanding` has already filtered
  to sales with a `clientId`, and the app loads clients and sales together.
- **`recommend.ts:80,90,99,101-103`** — comparator arms for tie shapes the
  generated data does not reach (two clients with identical
  most-recent-product dates AND identical most-recent-any dates). Covered:
  the with-product/without split, the recency ordering, and the name
  fallback.
- **`recurring.ts:160`** — the `(a.date < b.date ? 1 : -1)` arm for two
  stored instances on the same due date, which migration 0008's unique
  index on (template, due date) makes impossible in the database.
- **`sale.ts:168`** — `entry.name.trim()` for a line item whose `name` is a
  non-string; the surrounding validator has already covered both branches.
- **`seo.ts:50,149`** and **`site.ts:25`** — `NEXT_PUBLIC_SITE_URL`
  fallbacks and an optional-parameter default. Environment-shaped, and the
  brief forbids touching environment variables.
- **`settings.ts:44`** and **`terms.ts:68`** — the in-memory fallback's
  second read after `storageUsable` has already flipped to false. The
  first read through that path IS covered (the "private browsing" tests).
- **`notify/store.ts:16`** — the `createClient(...)` call itself, in the
  arm where both a service-role key and a URL are present. Both refusal
  paths are covered; constructing a real client would mean putting a
  service-role key in the test environment, which the brief forbids and
  which would be wrong regardless.

## What coverage does not tell you

Two things this number should not be read as promising:

1. **The sale-state transition table is not enforced in `src/lib`.** The
   library owns what each state *means* for the money; the transitions
   themselves are applied by the app layer as a conditional UPDATE in
   `src/app/upload-screen.tsx`. `sale-state.test.ts` writes the table out
   as documentation and proves the received/owed partition holds for every
   state — including states no legal transition should produce — but
   "expected → paid is allowed and paid → expected is not" is enforced
   above this layer and is out of scope for an engine suite.
2. **`src/app` is not covered at all**, by design. The brief scoped this to
   `src/lib`: not UI, not API routes, not Supabase. The settlement logic
   that lives in `upload-screen.tsx` — conditional settlement, the write
   queue, the three-state link handling — is the largest untested surface
   in the repo and is the obvious next suite.
