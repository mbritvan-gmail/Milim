-- Word forms: verb conjugation, and noun and adjective forms
--
--   * profiles.show_nikud: the "Show nikud" setting (on by default).
--   * word_forms: the forms of a verb (conjugation), noun or adjective, written the first time
--     someone opens that word's Conjugation / Forms view and shared by everyone after that (same
--     idea as quiz_options).
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

alter table public.profiles
  add column if not exists show_nikud boolean not null default true;

-- An earlier version of this script called the table verb_forms.
do $$
begin
  if to_regclass('public.verb_forms') is not null and to_regclass('public.word_forms') is null then
    alter table public.verb_forms rename to word_forms;
  end if;
end $$;

create table if not exists public.word_forms (
  vocab_entry_id uuid primary key references public.vocab_entries(id) on delete cascade,
  forms jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.word_forms enable row level security;

drop policy if exists "word_forms are readable by signed-in users" on public.word_forms;
create policy "word_forms are readable by signed-in users"
  on public.word_forms for select to authenticated using (true);

-- Friends-and-family scale: any signed-in user's request may write the first copy.
-- Tighten before a wider rollout (e.g. write through a server-side key instead).
drop policy if exists "word_forms can be added by signed-in users" on public.word_forms;
create policy "word_forms can be added by signed-in users"
  on public.word_forms for insert to authenticated with check (true);

drop policy if exists "word_forms can be replaced by signed-in users" on public.word_forms;
create policy "word_forms can be replaced by signed-in users"
  on public.word_forms for update to authenticated using (true) with check (true);
