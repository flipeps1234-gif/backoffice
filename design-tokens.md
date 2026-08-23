# design-tokens.md — the app's actual design language

Audited 2026-08-16 from the shipped components (globals.css,
page.tsx, product-card.tsx, owed-tab.tsx, confirmation-sheet.tsx,
running-totals.tsx, locale-picker.tsx, settings-page.tsx). This is
descriptive, not aspirational: every token below is IN USE in the
app today, with the file that proves it.

**The public pages (landing, help, legal) may use ONLY what is on
this page.** No new colors, no new fonts, no new component styles.
If a public page needs something the app doesn't have, the page
doesn't need it.

## Colors

Theme pair (CSS vars, globals.css):

| Token          | Light     | Dark      | Used as |
|----------------|-----------|-----------|---------|
| `--background` | `#ffffff` | `#0a0a0a` | page bg (`bg-background`) |
| `--foreground` | `#171717` | `#ededed` | text (`text-foreground`), selected pill bg |

Dark mode keys on the `.dark` CLASS (set pre-paint by the layout
script) — never `@media (prefers-color-scheme)` in markup.

Neutrals — Tailwind `neutral` scale only (no gray/slate/zinc):
- `text-neutral-500` secondary text, labels, kickers (everywhere)
- `text-neutral-400` placeholders, disabled-ish (`placeholder:text-neutral-400`)
- `border-neutral-200` / dark `border-neutral-800` — list borders, dividers (owed-tab)
- `border-neutral-300` / dark `border-neutral-600|700` — card + input + button borders (product-card, sheet)
- `bg-white` / dark `bg-neutral-900` — card surfaces (product-card, owed list)
- `bg-neutral-100` / dark `bg-neutral-900` — hover fills (locale-picker)

Ledger green (business money, success, selection) — `emerald`:
- `text-emerald-600` the business total (running-totals)
- `text-emerald-700 dark:text-emerald-400` positive net (product-card)
- chips: `bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200` (sheet "money in")
- selected card: `border-emerald-600 bg-emerald-600/10` (product-card)
- solid CTA equivalent: `bg-emerald-600 text-white` (sale flow's Yes button)

Warning amber (flags, owed-age, attention) — `amber`:
- flagged input: `border-amber-500 ring-2 ring-amber-200` (sheet)
- notice box: `bg-amber-50 border-amber-200 text-amber-900` (sheet)
- owed line: `text-amber-700 dark:text-amber-400` (running-totals)
- shared-account banner: `border-amber-300 bg-amber-50 text-amber-900` (upload-screen)

Danger red (money out, destructive) — `red`:
- `text-red-500` money-out amounts, `text-red-700 dark:text-red-400` negative net
- chips: `bg-red-50 text-red-700 ring-1 ring-red-200` (sheet "money out")

That is the whole palette: background/foreground, neutral, emerald,
amber, red. Nothing else exists in the app. No purple, no indigo,
no gradients anywhere.

## Type

- Face: the body default — `Arial, Helvetica, sans-serif`
  (globals.css `body`). Geist variables exist on `<html>` but the
  app's rendered face is the body stack; public pages inherit the
  same body rule and add nothing.
- Wordmark/header: `text-lg font-semibold tracking-tight` + the
  two-cards `<Mark />` SVG in `currentColor` (page.tsx).
- Section kicker: `text-xs uppercase tracking-wide text-neutral-500`
  (running-totals "BUSINESS", dashboard section heads).
- Form label: `text-xs font-medium text-neutral-500` (sheet).
- Body copy: `text-sm`; secondary `text-sm text-neutral-500`.
- Card title: `text-base font-semibold` (product-card).
- Money: ALWAYS `tabular-nums`; en-US `$` via `formatCents` — never
  localized (i18n.ts).
- Big numbers: `text-4xl font-semibold tabular-nums` (the Owed
  total), `text-2xl font-semibold tabular-nums text-emerald-600`
  (business total). This is the "Owed big-number style".
- Headings on public pages: reuse `text-lg font-semibold
  tracking-tight` (the header size) and `text-base font-semibold`.
  Marketing pages (landing, how it works, pricing, trade pages,
  about, contact, FAQ) open with ONE `text-4xl font-semibold
  tracking-tight` h1 — the Owed big-number size, already in the app;
  reading pages (help, privacy, terms) keep `text-lg`. Two h1 sizes,
  each tied to a page kind — not a free choice per page;
  the app has no display sizes beyond `text-4xl` and no font weight
  above `font-semibold` — so neither do public pages. No `font-bold`.

## Spacing

Tailwind default scale, used narrowly:
- Card padding `p-3` (sheet rows) / `p-4` (product cards).
- Stack rhythm `space-y-3|4|5`; section gap `mb-6`.
- Page frame: `mx-auto w-full max-w-lg px-4 py-8` (app main column).
  Public pages may widen to ~640px (`max-w-[40rem]`) per spec but
  keep `px-4` gutters.
- Tap targets: `h-11` (44px) minimum on real buttons (product-card
  steppers, sale flow).

## Radii

- `rounded-md` inputs, tiny buttons (sheet, locale-picker)
- `rounded-lg` list containers, standard buttons (owed list, steppers)
- `rounded-xl` cards (product-card frame)
- `rounded-full` chips/pills (direction chip, category chips)
- Nothing sharper, nothing rounder (no `rounded-2xl`+).

## Component styles (reuse these, never restyle)

- **Card**: `w-full rounded-xl border p-4 text-left` +
  `border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900`;
  selected variant `border-emerald-600 bg-emerald-600/10`.
- **List**: `divide-y divide-neutral-200 rounded-lg border
  border-neutral-200 bg-white dark:divide-neutral-800
  dark:border-neutral-800 dark:bg-neutral-900`.
- **Chip**: `rounded-full px-2 py-0.5 text-xs font-medium` + tinted
  bg + `ring-1` (emerald in / red out / neutral).
- **Primary button**: the sale flow's solid button —
  `rounded-lg bg-emerald-600 px-4 h-11 text-white font-medium`
  (hover darkens). Secondary: `rounded-lg border border-neutral-300
  h-11 px-4` with dark `border-neutral-600`.
- **Amber notice**: `rounded-md bg-amber-50 border border-amber-200
  px-3 py-2 text-sm text-amber-900`.
- **Input**: `w-full rounded-md border bg-white px-3 py-2 text-sm
  text-neutral-900 placeholder:text-neutral-400 focus:outline-none
  focus:border-neutral-900`, border `neutral-300`.
- **Real app components available to public pages** (with demo
  props only — Maria, $120.00, limpeza): `ConfirmationSheet`,
  `OwedTab`'s aged list styling, `ProductCard`. Wrap in a plain
  device frame: the List style above with `max-w-sm mx-auto` —
  no phone bezel art, no drop shadows (the app has none:
  `shadow-*` appears nowhere).

## Motion

One animation exists (progress sweep), plus `transition-colors` on
cards. Public pages get `transition-colors` at most. Honor
`prefers-reduced-motion` as globals.css already does.

## Explicitly absent (so absent on public pages too)

Gradients · shadows · purple/indigo · emoji-as-icons · stock
illustration · display serifs · font-bold+ · glow effects ·
rounded-2xl+ · any color outside {background, foreground, neutral,
emerald, amber, red}.
