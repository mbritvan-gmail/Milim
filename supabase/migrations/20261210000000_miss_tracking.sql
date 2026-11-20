-- Remembers how often each word has been missed, so flash card sessions can bring the words you struggle with
-- to the front. A miss adds one, a correct answer takes one off, and learning a word (or "I know this" or a
-- reset) clears it. Safe to run more than once. Until it is run, flash cards work as before.

alter table public.user_words add column if not exists miss_count integer not null default 0;

-- Record one answer (quiz or flashcard)
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
    insert into public.user_words (user_id, vocab_entry_id, correct_count, miss_count, last_reviewed_at, learned_at)
    values (
      auth.uid(), p_vocab_entry_id,
      case when p_correct then 1 else 0 end,
      case when p_correct then 0 else 1 end,
      now(),
      case when p_correct and v_need <= 1 then now() else null end
    )
    returning * into v_row;
  elsif p_correct then
    update public.user_words
    set correct_count = case when learned_at is null then correct_count + 1 else correct_count end,
        miss_count = case
          when learned_at is null and correct_count + 1 >= v_need then 0
          else greatest(miss_count - 1, 0)
        end,
        last_reviewed_at = now(),
        learned_at = case
          when learned_at is null and correct_count + 1 >= v_need then now()
          else learned_at
        end
    where user_id = auth.uid() and vocab_entry_id = p_vocab_entry_id
    returning * into v_row;
  else
    update public.user_words
    set correct_count = case when learned_at is not null then 0 else correct_count end,
        miss_count = miss_count + 1,
        learned_at = null,
        last_reviewed_at = now()
    where user_id = auth.uid() and vocab_entry_id = p_vocab_entry_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- "I know this"
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

  insert into public.user_words as uw (user_id, vocab_entry_id, correct_count, miss_count, last_reviewed_at, learned_at)
  values (auth.uid(), p_vocab_entry_id, v_need, 0, now(), now())
  on conflict (user_id, vocab_entry_id) do update
    set correct_count = greatest(uw.correct_count, excluded.correct_count),
        miss_count = 0,
        learned_at = coalesce(uw.learned_at, now()),
        last_reviewed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- Reset a word back to Learning with progress cleared
create or replace function public.reset_word(p_vocab_entry_id uuid)
returns public.user_words
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.user_words;
begin
  insert into public.user_words as uw (user_id, vocab_entry_id, correct_count, miss_count, last_reviewed_at, learned_at)
  values (auth.uid(), p_vocab_entry_id, 0, 0, now(), null)
  on conflict (user_id, vocab_entry_id) do update
    set correct_count = 0, miss_count = 0, learned_at = null, last_reviewed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- Undo: put a word back exactly as it was before the last answer
drop function if exists public.restore_word(uuid, boolean, integer, boolean);
create or replace function public.restore_word(
  p_vocab_entry_id uuid,
  p_existed boolean,
  p_correct_count integer,
  p_learned boolean,
  p_miss_count integer default null
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
    insert into public.user_words as uw (user_id, vocab_entry_id, correct_count, miss_count, last_reviewed_at, learned_at)
    values (auth.uid(), p_vocab_entry_id, greatest(p_correct_count, 0), greatest(coalesce(p_miss_count, 0), 0), now(), case when p_learned then now() else null end)
    on conflict (user_id, vocab_entry_id) do update
      set correct_count = greatest(p_correct_count, 0),
          miss_count = greatest(coalesce(p_miss_count, uw.miss_count), 0),
          learned_at = case when p_learned then coalesce(uw.learned_at, now()) else null end;
  end if;
end;
$$;
