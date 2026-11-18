-- Your own order for the vocabulary modules you have added
--
-- user_modules.position is the module's place in that person's own list. user_modules could be added
-- to and removed from but never changed; now its position can be.
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

alter table public.user_modules
  add column if not exists position integer not null default 0;

drop policy if exists user_modules_update on public.user_modules;
create policy user_modules_update on public.user_modules
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
