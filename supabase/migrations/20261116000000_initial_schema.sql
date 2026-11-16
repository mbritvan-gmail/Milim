-- Milim initial schema
-- Content (songs, lines, vocab) is shared; progress (user_words, quizzes) is per user.
-- Row-level security is enforced in Postgres, not just in app code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  show_transliteration boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Songs
-- ---------------------------------------------------------------------------
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  artist text,
  media_url text,
  media_type text check (media_type in ('spotify', 'youtube')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index songs_owner_idx on public.songs (owner_id);
create index songs_public_idx on public.songs (visibility, archived_at, created_at desc);

create trigger songs_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- A song that has been made public can never go back to private.
create or replace function public.songs_enforce_public_is_final()
returns trigger
language plpgsql
as $$
begin
  if old.visibility = 'public' and new.visibility = 'private' then
    raise exception 'A public song cannot be made private again';
  end if;
  return new;
end;
$$;

create trigger songs_public_is_final
  before update on public.songs
  for each row execute function public.songs_enforce_public_is_final();

-- Public songs cannot be hard-deleted by users (archive instead).
-- auth.uid() is null for the service role, which is how admin takedowns work.
create or replace function public.songs_block_public_delete()
returns trigger
language plpgsql
as $$
begin
  if old.visibility = 'public' and auth.uid() is not null then
    raise exception 'Public songs cannot be deleted; archive the song instead';
  end if;
  return old;
end;
$$;

create trigger songs_no_public_delete
  before delete on public.songs
  for each row execute function public.songs_block_public_delete();

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse)
-- ---------------------------------------------------------------------------
create or replace function public.is_song_owner(p_song_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.songs s
    where s.id = p_song_id and s.owner_id = auth.uid()
  );
$$;

create or replace function public.can_view_song(p_song_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.songs s
    where s.id = p_song_id
      and (s.owner_id = auth.uid() or s.visibility = 'public')
  );
$$;

-- ---------------------------------------------------------------------------
-- Lines
-- ---------------------------------------------------------------------------
create table public.lines (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null,
  hebrew text not null,
  transliteration text,
  english text,
  unique (song_id, position)
);

-- ---------------------------------------------------------------------------
-- Vocabulary (shared, deduplicated across songs)
-- ---------------------------------------------------------------------------
create table public.vocab_entries (
  id uuid primary key default gen_random_uuid(),
  lemma text not null,
  transliteration text,
  english text not null,
  part_of_speech text,
  created_at timestamptz not null default now(),
  unique (lemma, english)
);

-- Cached wrong answers for multiple choice quizzes.
create table public.quiz_options (
  vocab_entry_id uuid not null references public.vocab_entries (id) on delete cascade,
  option_text text not null,
  primary key (vocab_entry_id, option_text)
);

create table public.song_words (
  song_id uuid not null references public.songs (id) on delete cascade,
  vocab_entry_id uuid not null references public.vocab_entries (id) on delete cascade,
  surface_form text not null,
  line_id uuid references public.lines (id) on delete set null,
  source text not null default 'ai' check (source in ('ai', 'user')),
  primary key (song_id, vocab_entry_id)
);

create index song_words_vocab_idx on public.song_words (vocab_entry_id);

-- ---------------------------------------------------------------------------
-- Edit suggestions (non-owners propose, owner approves)
-- ---------------------------------------------------------------------------
create table public.edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  suggested_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('line_translation', 'add_word', 'remove_word')),
  line_id uuid references public.lines (id) on delete cascade,
  vocab_entry_id uuid references public.vocab_entries (id) on delete cascade,
  proposed_value text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index edit_suggestions_song_idx on public.edit_suggestions (song_id, status);

-- ---------------------------------------------------------------------------
-- Personal queue and libraries
-- ---------------------------------------------------------------------------
create table public.user_songs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create table public.libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.library_songs (
  library_id uuid not null references public.libraries (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  primary key (library_id, song_id)
);

-- Owners automatically have their own songs in their queue.
create or replace function public.songs_add_to_owner_queue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_songs (user_id, song_id)
  values (new.owner_id, new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger songs_owner_queue
  after insert on public.songs
  for each row execute function public.songs_add_to_owner_queue();

-- ---------------------------------------------------------------------------
-- Progress (per user): Leitner boxes, learned words, quizzes
-- ---------------------------------------------------------------------------
create table public.user_words (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vocab_entry_id uuid not null references public.vocab_entries (id) on delete cascade,
  leitner_box smallint not null default 1 check (leitner_box between 1 and 5),
  correct_count integer not null default 0,
  last_reviewed_at timestamptz,
  next_due_at timestamptz not null default now(),
  learned_at timestamptz,
  primary key (user_id, vocab_entry_id)
);

create index user_words_due_idx on public.user_words (user_id, next_due_at);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  score integer not null,
  total integer not null,
  taken_at timestamptz not null default now()
);

create index quiz_attempts_user_song_idx on public.quiz_attempts (user_id, song_id, taken_at desc);

create table public.quiz_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  vocab_entry_id uuid not null references public.vocab_entries (id) on delete cascade,
  chosen text,
  correct boolean not null,
  primary key (attempt_id, vocab_entry_id)
);

-- Record one answer (quiz or flashcard). A word is "learned" after 3 cumulative
-- correct answers. Wrong answers drop the word back to box 1, due immediately.
-- Box intervals: 1, 2, 4, 8, 16 days.
create or replace function public.record_answer(p_vocab_entry_id uuid, p_correct boolean)
returns public.user_words
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.user_words;
  v_box smallint;
  v_count integer;
begin
  select * into v_row
  from public.user_words
  where user_id = auth.uid() and vocab_entry_id = p_vocab_entry_id;

  v_box := coalesce(v_row.leitner_box, 1);
  v_count := coalesce(v_row.correct_count, 0);

  if p_correct then
    v_count := v_count + 1;
    v_box := least(v_box + 1, 5);
  else
    v_box := 1;
  end if;

  insert into public.user_words as uw
    (user_id, vocab_entry_id, leitner_box, correct_count, last_reviewed_at, next_due_at, learned_at)
  values (
    auth.uid(), p_vocab_entry_id, v_box, v_count, now(),
    case when p_correct then now() + (power(2, v_box - 1)::int || ' days')::interval else now() end,
    case when v_count >= 3 then now() else null end
  )
  on conflict (user_id, vocab_entry_id) do update set
    leitner_box = excluded.leitner_box,
    correct_count = excluded.correct_count,
    last_reviewed_at = excluded.last_reviewed_at,
    next_due_at = excluded.next_due_at,
    learned_at = coalesce(uw.learned_at, excluded.learned_at)
  returning * into v_row;

  return v_row;
end;
$$;

-- "I already know this word": mark learned without going through the steps.
create or replace function public.mark_word_known(p_vocab_entry_id uuid)
returns public.user_words
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.user_words;
begin
  insert into public.user_words as uw
    (user_id, vocab_entry_id, leitner_box, correct_count, last_reviewed_at, next_due_at, learned_at)
  values (auth.uid(), p_vocab_entry_id, 3, 3, now(), now() + interval '4 days', now())
  on conflict (user_id, vocab_entry_id) do update set
    correct_count = greatest(uw.correct_count, 3),
    leitner_box = greatest(uw.leitner_box, 3),
    learned_at = coalesce(uw.learned_at, now())
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Master Dictionary: every word in songs in your queue, with your status.
-- ---------------------------------------------------------------------------
create view public.master_dictionary
with (security_invoker = true) as
select
  v.id as vocab_entry_id,
  v.lemma,
  v.transliteration,
  v.english,
  v.part_of_speech,
  uw.leitner_box,
  uw.correct_count,
  uw.next_due_at,
  uw.learned_at,
  case
    when uw.learned_at is not null then 'learned'
    when uw.user_id is not null then 'learning'
    else 'new'
  end as status
from public.vocab_entries v
left join public.user_words uw
  on uw.vocab_entry_id = v.id and uw.user_id = auth.uid()
where exists (
  select 1
  from public.song_words sw
  join public.user_songs us on us.song_id = sw.song_id
  where sw.vocab_entry_id = v.id and us.user_id = auth.uid()
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.lines enable row level security;
alter table public.vocab_entries enable row level security;
alter table public.quiz_options enable row level security;
alter table public.song_words enable row level security;
alter table public.edit_suggestions enable row level security;
alter table public.user_songs enable row level security;
alter table public.libraries enable row level security;
alter table public.library_songs enable row level security;
alter table public.user_words enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

-- Profiles: everyone signed in can read names; you edit only your own.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Songs: owner sees own; everyone signed in sees public songs.
create policy songs_select on public.songs
  for select to authenticated using (owner_id = auth.uid() or visibility = 'public');
create policy songs_insert on public.songs
  for insert to authenticated with check (owner_id = auth.uid());
create policy songs_update on public.songs
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy songs_delete on public.songs
  for delete to authenticated using (owner_id = auth.uid());

-- Lines: readable if the song is; writable by the song owner.
create policy lines_select on public.lines
  for select to authenticated using (public.can_view_song(song_id));
create policy lines_write on public.lines
  for all to authenticated
  using (public.is_song_owner(song_id)) with check (public.is_song_owner(song_id));

-- Vocab is a shared dictionary: read all, add new entries, never edit/delete.
create policy vocab_select on public.vocab_entries
  for select to authenticated using (true);
create policy vocab_insert on public.vocab_entries
  for insert to authenticated with check (true);

create policy quiz_options_select on public.quiz_options
  for select to authenticated using (true);
create policy quiz_options_insert on public.quiz_options
  for insert to authenticated with check (true);

-- Song words: readable if the song is; writable by the song owner.
create policy song_words_select on public.song_words
  for select to authenticated using (public.can_view_song(song_id));
create policy song_words_write on public.song_words
  for all to authenticated
  using (public.is_song_owner(song_id)) with check (public.is_song_owner(song_id));

-- Suggestions: anyone who can view the song can suggest; owner and author can see;
-- only the owner resolves them.
create policy suggestions_select on public.edit_suggestions
  for select to authenticated
  using (suggested_by = auth.uid() or public.is_song_owner(song_id));
create policy suggestions_insert on public.edit_suggestions
  for insert to authenticated
  with check (suggested_by = auth.uid() and public.can_view_song(song_id));
create policy suggestions_update on public.edit_suggestions
  for update to authenticated
  using (public.is_song_owner(song_id)) with check (public.is_song_owner(song_id));

-- Queue and libraries: strictly personal.
create policy user_songs_select on public.user_songs
  for select to authenticated using (user_id = auth.uid());
create policy user_songs_insert on public.user_songs
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_song(song_id));
create policy user_songs_delete on public.user_songs
  for delete to authenticated using (user_id = auth.uid());

create policy libraries_all on public.libraries
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy library_songs_all on public.library_songs
  for all to authenticated
  using (exists (select 1 from public.libraries l where l.id = library_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.libraries l where l.id = library_id and l.user_id = auth.uid()));

-- Progress: strictly personal.
create policy user_words_all on public.user_words
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy quiz_attempts_all on public.quiz_attempts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy quiz_answers_all on public.quiz_answers
  for all to authenticated
  using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
