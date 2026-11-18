-- Song groups and your own song order
--
--   * song_groups: named folders for a person's songs (private to them).
--   * user_songs.group_id: which group (if any) a song is in, for that person.
--   * user_songs.position: the song's place in that person's own order.
--
-- Deleting a group never deletes songs: they simply drop back to "not in a group".
-- Run this once in the Supabase SQL editor. It is safe to run again.

create table if not exists public.song_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists song_groups_user_idx on public.song_groups (user_id, position);

alter table public.user_songs
  add column if not exists group_id uuid references public.song_groups (id) on delete set null,
  add column if not exists position integer not null default 0;

alter table public.song_groups enable row level security;

drop policy if exists song_groups_all on public.song_groups;
create policy song_groups_all on public.song_groups
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- user_songs could be added to and removed from, but never changed. Now its group and position can be,
-- and only to one of your own groups.
drop policy if exists user_songs_update on public.user_songs;
create policy user_songs_update on public.user_songs
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (group_id is null or exists (select 1 from public.song_groups g where g.id = group_id and g.user_id = auth.uid()))
  );
