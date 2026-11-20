-- The voice used for spoken words (Settings > Sound > Voice). Safe to run more than once.
alter table public.profiles
  add column if not exists speech_voice text not null default 'female'
    check (speech_voice in ('female', 'male'));
