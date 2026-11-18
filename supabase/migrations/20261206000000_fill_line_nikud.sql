-- Lets the temporary "Add nikud to all songs" tool in Settings fill in nikud on lyric lines of any song.
-- It can only fill lines that have no nikud yet, and only with the same letters plus vowel marks
-- (the letters yod and vav are ignored in the comparison, because fully pointed spelling may add or drop them).
-- Safe to run more than once.

create or replace function public.fill_line_nikud(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  saved integer := 0;
  marks text := '[' || chr(1425) || '-' || chr(1479) || ']';
  not_letters text := '[^' || chr(1488) || '-' || chr(1514) || ']';
  yod_vav text := '[' || chr(1497) || chr(1493) || ']';
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    update public.lines l
    set vocalized = item->>'vocalized'
    where l.id = (item->>'id')::uuid
      and l.vocalized is null
      and coalesce(item->>'vocalized', '') <> ''
      and regexp_replace(regexp_replace(regexp_replace(item->>'vocalized', marks, '', 'g'), not_letters, '', 'g'), yod_vav, '', 'g')
        = regexp_replace(regexp_replace(regexp_replace(l.hebrew, marks, '', 'g'), not_letters, '', 'g'), yod_vav, '', 'g');
    if found then
      saved := saved + 1;
    end if;
  end loop;
  return saved;
end;
$$;

grant execute on function public.fill_line_nikud(jsonb) to authenticated;
