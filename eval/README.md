# /eval — the test set the product builds for itself

Every extraction I correct gets saved here as a pair: the input, and the
answer that was actually right. That's how we bake off providers later —
same cases, different `EXTRACT_PROVIDER`, compare.

## Layout

```
eval/
  cases/
    <case-name>/
      input.png        the screenshot (mine or synthetic — never a real customer's)
      expected.json    the corrected transactions, exactly as the sheet ended up
```

## expected.json

```json
{
  "transactions": [
    { "payer": "Maria Santos", "amountCents": 6500, "date": "2026-07-14", "memo": "driveway" }
  ],
  "warnings": []
}
```

Money is integer cents. Dates are YYYY-MM-DD. `warnings` uses the codes in
`src/lib/extract/types.ts` — a Venmo social-feed screenshot is a case too,
with zero transactions and one `no_amounts_visible` warning.

Capturing corrections automatically comes with v0.2, when there's a database
to hang them off. Until then: save them by hand.
