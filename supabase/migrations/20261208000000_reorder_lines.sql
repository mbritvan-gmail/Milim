-- Lets the owner of a song move and add section headers (Verse, Chorus...) in Edit mode.
-- Puts a song's lines into the order given. The list must contain every line of the song exactly once.
-- Runs with the caller's own permissions, so only the song's owner can use it on their song.
-- Safe to run more than once.

create or replace function public.reorder_lines(p_song_id uuid, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  total integer;
  moved integer;
begin
  select count(*) into total from public.lines where song_id = p_song_id;
  if total <> coalesce(array_length(p_ids, 1), 0) then
    raise exception 'The list of lines does not match the song';
  end if;
  -- Two steps, because every line in a song must have its own position at every moment.
  update public.lines l
  set position = 100000 + x.ord
  from unnest(p_ids) with ordinality as x(id, ord)
  where l.id = x.id and l.song_id = p_song_id;
  get diagnostics moved = row_count;
  if moved <> total then
    raise exception 'The list of lines does not match the song';
  end if;
  update public.lines l
  set position = x.ord - 1
  from unnest(p_ids) with ordinality as x(id, ord)
  where l.id = x.id and l.song_id = p_song_id;
end;
$$;

grant execute on function public.reorder_lines(uuid, uuid[]) to authenticated;
