-- Song requests
--
-- A person can request a song (title, artist, cover art and links, no lyrics). Requests are public:
-- everyone can see them. Anyone can add the lyrics; the person who does owns the song and the
-- requester gets it in their list automatically.
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

create table if not exists public.song_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  artist text,
  album text,
  cover_url text,
  spotify_url text,
  youtube_url text,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'cancelled')),
  song_id uuid references public.songs (id) on delete set null,
  fulfilled_by uuid references public.profiles (id) on delete set null,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists song_requests_status_idx on public.song_requests (status, created_at desc);

alter table public.song_requests enable row level security;

-- Everyone signed in can see open and filled requests; a cancelled one is only visible to its author.
drop policy if exists song_requests_select on public.song_requests;
create policy song_requests_select on public.song_requests
  for select to authenticated using (status <> 'cancelled' or requester_id = auth.uid());

drop policy if exists song_requests_insert on public.song_requests;
create policy song_requests_insert on public.song_requests
  for insert to authenticated with check (requester_id = auth.uid() and status = 'open');

-- The author can cancel their own open request. Nothing else can be changed directly:
-- filling a request goes through the function below.
drop policy if exists song_requests_cancel on public.song_requests;
create policy song_requests_cancel on public.song_requests
  for update to authenticated
  using (requester_id = auth.uid() and status = 'open')
  with check (requester_id = auth.uid() and status in ('open', 'cancelled'));

-- Marks a request as filled by one of the caller's own public songs and puts that song in the
-- requester's list (a row for someone else, which a normal insert isn't allowed to make).
create or replace function public.fulfill_song_request(p_request_id uuid, p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (
    select 1 from public.songs s
    where s.id = p_song_id and s.owner_id = auth.uid() and s.visibility = 'public'
  ) then
    raise exception 'The song must be your own public song';
  end if;
  update public.song_requests
  set status = 'fulfilled', song_id = p_song_id, fulfilled_by = auth.uid(), fulfilled_at = now()
  where id = p_request_id and status = 'open'
  returning requester_id into v_requester;
  if v_requester is null then
    raise exception 'That request was already filled or cancelled';
  end if;
  insert into public.user_songs (user_id, song_id) values (v_requester, p_song_id) on conflict do nothing;
end;
$$;
grant execute on function public.fulfill_song_request(uuid, uuid) to authenticated;
