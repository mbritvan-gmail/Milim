-- Lyrics size: how big the lyrics are on the song page (small, medium or large).
-- Safe to run more than once. Run it in the Supabase SQL editor.
alter table public.profiles
  add column if not exists lyrics_size text not null default 'medium'
    check (lyrics_size in ('small', 'medium', 'large'));
