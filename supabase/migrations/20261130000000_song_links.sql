-- Two player links per song, album art, and the preferred player
--
--   * songs.spotify_url / songs.youtube_url: a song can have both links (the old single link in
--     media_url / media_type is copied into the matching one).
--   * songs.album / songs.cover_url: filled in from the song search when a song is added.
--   * profiles.preferred_player: which player a song page opens with ('youtube' by default).
--
-- Run this once in the Supabase SQL editor. It is safe to run again.

alter table public.songs
  add column if not exists spotify_url text,
  add column if not exists youtube_url text,
  add column if not exists album text,
  add column if not exists cover_url text;

update public.songs set spotify_url = media_url where spotify_url is null and media_type = 'spotify' and media_url is not null;
update public.songs set youtube_url = media_url where youtube_url is null and media_type = 'youtube' and media_url is not null;

alter table public.profiles
  add column if not exists preferred_player text not null default 'youtube'
    check (preferred_player in ('spotify', 'youtube'));
