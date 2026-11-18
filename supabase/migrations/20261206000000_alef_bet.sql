-- Alef-bet trainer: which letter cards a person has seen.
--
-- One small new table. It does not touch any existing table, and letters are not stored as words,
-- so they never appear in the Dictionary, flash cards or song quizzes.
--
-- Until this is run, the trainer still opens and the cards still work, but progress can't be saved
-- (the start screen says so).
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

create table if not exists public.alef_cards_seen (
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id text not null check (char_length(card_id) between 1 and 40),
  seen_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.alef_cards_seen enable row level security;

-- Strictly personal, like the rest of a person's progress.
drop policy if exists alef_cards_seen_all on public.alef_cards_seen;
create policy alef_cards_seen_all on public.alef_cards_seen
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
