-- 0016: the founding-hundred email list (public landing page CTA).
-- Write-only from clients: anyone may add an email, nobody may read the
-- list through the API — the owner reads it in the dashboard with the
-- service role. Idempotent like every migration in this folder.

create table if not exists public.founding_list (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (char_length(email) <= 320 and position('@' in email) > 1),
  created_at timestamptz not null default now()
);

-- One row per address, case-insensitive. The API treats a duplicate as
-- success — signing up twice is enthusiasm, not an error.
create unique index if not exists founding_list_email_key
  on public.founding_list (lower(email));

alter table public.founding_list enable row level security;

drop policy if exists "founding: public signup" on public.founding_list;
create policy "founding: public signup" on public.founding_list
  for insert to anon, authenticated
  with check (true);

-- Deliberately NO select/update/delete policies: the list of everyone
-- who signed up must never be readable with the public anon key.
