-- Nikud for song lyrics
--
-- lines.vocalized holds a lyric line with nikud (vowel marks). It is filled in, one song at a time,
-- by the "Add nikud" button when editing a song. Words get their nikud in vocab_entries.vocalized
-- (added by the vocabulary-modules script).
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

alter table public.lines
  add column if not exists vocalized text;
