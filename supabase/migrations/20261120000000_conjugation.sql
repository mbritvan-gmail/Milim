-- Verb conjugation
--
--   * profiles.show_nikud: the "Show nikud" setting (on by default).
--   * verb_forms: conjugated forms for a verb, written the first time someone opens a verb's
--     Conjugation view and shared by everyone after that (same idea as quiz_options).
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

alter table public.profiles
  add column if not exists show_nikud boolean not null default true;

create table if not exists public.verb_forms (
  vocab_entry_id uuid primary key references public.vocab_entries(id) on delete cascade,
  forms jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.verb_forms enable row level security;

drop policy if exists "verb_forms are readable by signed-in users" on public.verb_forms;
create policy "verb_forms are readable by signed-in users"
  on public.verb_forms for select to authenticated using (true);

-- Friends-and-family scale: any signed-in user's request may write the first copy.
-- Tighten before a wider rollout (e.g. write through a server-side key instead).
drop policy if exists "verb_forms can be added by signed-in users" on public.verb_forms;
create policy "verb_forms can be added by signed-in users"
  on public.verb_forms for insert to authenticated with check (true);

drop policy if exists "verb_forms can be replaced by signed-in users" on public.verb_forms;
create policy "verb_forms can be replaced by signed-in users"
  on public.verb_forms for update to authenticated using (true) with check (true);
