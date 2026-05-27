-- Add Russian display names for genres while keeping stable slug identifiers in `genres.name`.
-- Safe migration: does NOT modify `genres.id` or `genres.name`, so all existing relationships remain valid.
-- Rollback: drop the `name_ru` column and revert dependent views/RPCs.

begin;

alter table public.genres
  add column if not exists name_ru text;

update public.genres
set name_ru = case name
  when 'fiction' then 'Художественная литература'
  when 'literary_fiction' then 'Литературная проза'
  when 'science_fiction' then 'Научная фантастика'
  when 'fantasy' then 'Фэнтези'
  when 'mystery_thriller' then 'Детектив и триллер'
  when 'history' then 'История'
  when 'biography_memoir' then 'Биографии и мемуары'
  when 'science' then 'Наука'
  when 'technology' then 'Технологии'
  when 'business' then 'Бизнес'
  when 'finance' then 'Финансы'
  when 'economics' then 'Экономика'
  when 'psychology' then 'Психология'
  when 'philosophy' then 'Философия'
  when 'self_improvement' then 'Саморазвитие'
  when 'health_wellness' then 'Здоровье и благополучие'
  when 'arts_culture' then 'Искусство и культура'
  when 'education' then 'Образование'
  when 'religion_spirituality' then 'Религия и духовность'
  when 'politics_current_affairs' then 'Политика и общество'
  when 'other' then 'Другое'
  else name_ru
end
where name_ru is null or name_ru = '';

do $$
declare
  v_missing integer;
  v_dupes integer;
begin
  select count(*) into v_missing
  from public.genres
  where name_ru is null or length(trim(name_ru)) = 0;

  if v_missing > 0 then
    raise exception 'genres.name_ru backfill incomplete: % rows missing name_ru', v_missing;
  end if;

  select count(*) into v_dupes
  from (
    select lower(trim(name_ru)) as k, count(*) as c
    from public.genres
    group by lower(trim(name_ru))
    having count(*) > 1
  ) dup;

  if v_dupes > 0 then
    raise exception 'genres.name_ru must be unique: found % duplicate label(s)', v_dupes;
  end if;
end $$;

alter table public.genres
  alter column name_ru set not null;

create unique index if not exists genres_name_ru_unique
  on public.genres (name_ru);

commit;

