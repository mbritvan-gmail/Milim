-- Vocabulary modules: themed word lists that anyone signed in can create (paste Hebrew words, the AI
-- fills in the rest), share publicly or keep private, add to their Dictionary and study.
--
--   * vocab_entries gets three optional columns: vocalized (the word with nikud), gender (m / f)
--     and plural (unpointed plural form).
--   * modules / module_words / user_modules, shaped like songs / song_words / user_songs.
--   * master_dictionary now also includes the words of modules you have added.
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

alter table public.vocab_entries
  add column if not exists vocalized text,
  add column if not exists gender text check (gender in ('m', 'f')),
  add column if not exists plural text;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists modules_owner_idx on public.modules (owner_id);
create index if not exists modules_public_idx on public.modules (visibility, archived_at, created_at desc);

drop trigger if exists modules_updated_at on public.modules;
create trigger modules_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

create table if not exists public.module_words (
  module_id uuid not null references public.modules (id) on delete cascade,
  vocab_entry_id uuid not null references public.vocab_entries (id) on delete cascade,
  position integer not null default 0,
  primary key (module_id, vocab_entry_id)
);

create table if not exists public.user_modules (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, module_id)
);
create index if not exists user_modules_module_idx on public.user_modules (module_id);

-- A module that has been made public can never go back to private, and public modules cannot be
-- deleted (archive them), the same rules as songs.
create or replace function public.modules_enforce_public_is_final()
returns trigger
language plpgsql
as $$
begin
  if old.visibility = 'public' and new.visibility = 'private' then
    raise exception 'A public module cannot be made private again';
  end if;
  return new;
end;
$$;
drop trigger if exists modules_public_is_final on public.modules;
create trigger modules_public_is_final
  before update on public.modules
  for each row execute function public.modules_enforce_public_is_final();

create or replace function public.modules_block_public_delete()
returns trigger
language plpgsql
as $$
begin
  if old.visibility = 'public' and auth.uid() is not null then
    raise exception 'Public modules cannot be deleted; archive the module instead';
  end if;
  return old;
end;
$$;
drop trigger if exists modules_no_public_delete on public.modules;
create trigger modules_no_public_delete
  before delete on public.modules
  for each row execute function public.modules_block_public_delete();

-- Owners automatically have their own modules added.
create or replace function public.modules_add_to_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_modules (user_id, module_id) values (new.owner_id, new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists modules_owner_added on public.modules;
create trigger modules_owner_added
  after insert on public.modules
  for each row execute function public.modules_add_to_owner();

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_module_owner(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.modules m where m.id = p_module_id and m.owner_id = auth.uid());
$$;

create or replace function public.can_view_module(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.modules m
    where m.id = p_module_id and (m.owner_id = auth.uid() or m.visibility = 'public')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.modules enable row level security;
alter table public.module_words enable row level security;
alter table public.user_modules enable row level security;

drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules
  for select to authenticated using (owner_id = auth.uid() or visibility = 'public');
drop policy if exists modules_insert on public.modules;
create policy modules_insert on public.modules
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists modules_update on public.modules;
create policy modules_update on public.modules
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists modules_delete on public.modules;
create policy modules_delete on public.modules
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists module_words_select on public.module_words;
create policy module_words_select on public.module_words
  for select to authenticated using (public.can_view_module(module_id));
drop policy if exists module_words_write on public.module_words;
create policy module_words_write on public.module_words
  for all to authenticated
  using (public.is_module_owner(module_id)) with check (public.is_module_owner(module_id));

drop policy if exists user_modules_select on public.user_modules;
create policy user_modules_select on public.user_modules
  for select to authenticated using (user_id = auth.uid());
drop policy if exists user_modules_insert on public.user_modules;
create policy user_modules_insert on public.user_modules
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_module(module_id));
drop policy if exists user_modules_delete on public.user_modules;
create policy user_modules_delete on public.user_modules
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Dictionary: words from your songs and from the modules you have added
-- ---------------------------------------------------------------------------
create or replace view public.master_dictionary
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
)
or exists (
  select 1
  from public.module_words mw
  join public.user_modules um on um.module_id = mw.module_id
  where mw.vocab_entry_id = v.id and um.user_id = auth.uid()
);

-- ---------------------------------------------------------------------------
-- Fill in blank nikud / gender / plural on shared words
-- ---------------------------------------------------------------------------
-- Words are shared by everyone and are never edited. When a module meets a word that already exists
-- without these details (for example one that came from a song), this adds them, but only where
-- they are still empty.
create or replace function public.fill_word_extras(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    update public.vocab_entries
    set vocalized = coalesce(vocalized, nullif(item->>'vocalized', '')),
        gender = coalesce(gender, nullif(item->>'gender', '')),
        plural = coalesce(plural, nullif(item->>'plural', ''))
    where id = (item->>'id')::uuid;
  end loop;
end;
$$;
grant execute on function public.fill_word_extras(jsonb) to authenticated;
