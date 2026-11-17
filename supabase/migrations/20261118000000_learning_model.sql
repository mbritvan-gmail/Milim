-- Learning model v2
--
--   New      = never answered
--   Learning = answered, but not yet "learned"
--   Learned  = answered correctly `learn_after` times (a per-person setting, 1 to 3, default 2).
--              Quiz and flashcard answers both count. One miss on a learned word puts it back to
--              Learning with its progress cleared. There is no calendar: a word is just known or not.
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

-- ---------------------------------------------------------------------------
-- Per-person settings
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists learn_after smallint not null default 2 check (learn_after between 1 and 3),
  add column if not exists study_direction text not null default 'he-en'
    check (study_direction in ('he-en', 'en-he', 'mixed'));

-- Words already answered correctly twice or more count as learned under the new default.
update public.user_words
set learned_at = coalesce(last_reviewed_at, now())
where learned_at is null and correct_count >= 2;

-- ---------------------------------------------------------------------------
-- Record one answer (quiz or flashcard)
-- ---------------------------------------------------------------------------
create or replace function public.record_answer(p_vocab_entry_id uuid, p_correct boolean)
returns public.user_words
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.user_words;
  v_need smallint;
begin
  select coalesce(learn_after, 2) into v_need from public.profiles where id = auth.uid();
  v_need := coalesce(v_need, 2);

  select * into v_row
  from public.user_words
  where user_id = auth.uid() and vocab_entry_id = p_vocab_entry_id;

  if v_row.user_id is null then
    -- First time this word is answered: it becomes Learning (or Learned right away if one answer is enough).
    insert into public.user_words (user_id, vocab_entry_id, correct_count, last_reviewed_at, learned_at)
    values (
      auth.uid(), p_vocab_entry_id,
      case when p_correct then 1 else 0 end,
      now(),
      case when p_correct and v_need <= 1 then now() else null end
    )
    returning * into v_row;
  elsif p_correct then
    update public.user_words
    set correct_count = case when learned_at is null then correct_count + 1 else correct_count end,
        last_reviewed_at = now(),
        learned_at = case
          when learned_at is null and correct_count + 1 >= v_need then now()
          else learned_at
        end
    where user_id = auth.uid() and vocab_entry_id = p_vocab_entry_id
    returning * into v_row;
  else
    -- A miss: a learned word goes back to Learning with progress cleared; otherwise progress is kept.
    update public.user_words
    set correct_count = case when learned_at is not null then 0 else correct_count end,
        learned_at = null,
        last_reviewed_at = now()
    where user_id = auth.uid() and vocab_entry_id = p_vocab_entry_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- "I know this"
-- ---------------------------------------------------------------------------
create or replace function public.mark_word_known(p_vocab_entry_id uuid)
returns public.user_words
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.user_words;
  v_need smallint;
begin
  select coalesce(learn_after, 2) into v_need from public.profiles where id = auth.uid();
  v_need := coalesce(v_need, 2);

  insert into public.user_words as uw (user_id, vocab_entry_id, correct_count, last_reviewed_at, learned_at)
  values (auth.uid(), p_vocab_entry_id, v_need, now(), now())
  on conflict (user_id, vocab_entry_id) do update
    set correct_count = greatest(uw.correct_count, excluded.correct_count),
        learned_at = coalesce(uw.learned_at, now()),
        last_reviewed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reset a word back to Learning with progress cleared
-- ---------------------------------------------------------------------------
create or replace function public.reset_word(p_vocab_entry_id uuid)
returns public.user_words
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.user_words;
begin
  insert into public.user_words as uw (user_id, vocab_entry_id, correct_count, last_reviewed_at, learned_at)
  values (auth.uid(), p_vocab_entry_id, 0, now(), null)
  on conflict (user_id, vocab_entry_id) do update
    set correct_count = 0, learned_at = null, last_reviewed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Undo: put a word back exactly as it was before the last answer
-- ---------------------------------------------------------------------------
create or replace function public.restore_word(
  p_vocab_entry_id uuid,
  p_existed boolean,
  p_correct_count integer,
  p_learned boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not p_existed then
    delete from public.user_words
    where user_id = auth.uid() and vocab_entry_id = p_vocab_entry_id;
  else
    insert into public.user_words as uw (user_id, vocab_entry_id, correct_count, last_reviewed_at, learned_at)
    values (auth.uid(), p_vocab_entry_id, greatest(p_correct_count, 0), now(), case when p_learned then now() else null end)
    on conflict (user_id, vocab_entry_id) do update
      set correct_count = greatest(p_correct_count, 0),
          learned_at = case when p_learned then coalesce(uw.learned_at, now()) else null end;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Change "correct answers to learn a word"
-- ---------------------------------------------------------------------------
create or replace function public.set_learn_after(p_n smallint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_n is null or p_n < 1 or p_n > 3 then
    raise exception 'learn_after must be 1, 2 or 3';
  end if;

  update public.profiles set learn_after = p_n where id = auth.uid();

  -- Words that already have enough correct answers now count as learned.
  -- (Raising the number never un-learns a word; only a miss or a reset does.)
  update public.user_words
  set learned_at = now()
  where user_id = auth.uid() and learned_at is null and correct_count >= p_n;
end;
$$;
