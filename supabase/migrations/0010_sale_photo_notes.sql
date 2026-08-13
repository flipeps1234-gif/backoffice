-- Ledger v0.6 — optional photo + notes on sales (proof-of-work).
-- Run after 0009.
--
-- The photo is a downscaled JPEG data URL (~≤300KB, compressed
-- client-side in src/app/photo.ts) stored IN the row. Deliberate:
-- no storage bucket means no second RLS surface, and the policies
-- that protect the sale protect its photo. This is the first place
-- the app RETAINS an image, which is a terms-gate change — the gate
-- text and TERMS_VERSION bump ship in the same release.

alter table public.sales
  add column if not exists notes text not null default '',
  add column if not exists photo text
    check (photo is null or length(photo) <= 500000);
