# contado

A ledger app for very small service businesses — cleaners, landscapers,
barbers — paid through Venmo, Cash App, Zelle and cash. You upload
screenshots of a payment feed, AI reads the rows, and you confirm each one
and swipe it business or personal. Cash is logged by hand in a few taps.
English, Spanish and Portuguese. Live at <https://getcontado.com>.

## Stack

Next.js 16 (App Router) and React 19, Tailwind CSS 4, Supabase (Postgres
with row-level security, and sign-in), OpenAI for reading screenshots,
hosted on Vercel.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill it in; the file explains each value
npm run dev                  # http://localhost:3000
```

## Checks

```bash
npx tsc --noEmit
npm run lint
npm test          # tests/security and tests/unit
npm run build
```

## Where things live

- `src/app` — pages and components. The app is at `/app`; the public site
  is everything else.
- `src/lib` — the logic, as pure TypeScript: money in integer cents,
  extraction, dedupe, matching.
- `src/lib/messages/*.ts` — every user-visible string, in EN, ES and PT.
- `help-docs/` — the help center articles, one markdown file per language.
- `supabase/migrations/` — SQL migrations, applied by hand.
- `CLAUDE.md`, `DEPLOY.md`, `design-tokens.md` — project notes, the deploy
  checklist and the design rules. Read `DEPLOY.md` before pushing: a push to
  `main` deploys to production.

Venmo, Cash App and Zelle are trademarks of their owners. contado is
independent and not affiliated with or endorsed by them.
