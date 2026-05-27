-- Read-only views derived from the existing books schema. No ALTER TABLE on books.
-- All views use security_invoker so they respect the caller's RLS on underlying tables.

-- ----------------------------------------------------------------------------
-- books_catalog: flat row per book with comma-joined genres for cheap mobile reads
-- ----------------------------------------------------------------------------

create or replace view public.books_catalog
with (security_invoker = true)
as
select
  b.id,
  b.id::text as book_id,
  b.title,
  b.author,
  b.language,
  b.cover_image_url,
  b.keywords,
  coalesce(
    array_agg(g.name_ru order by g.name_ru) filter (where g.name_ru is not null),
    array[]::text[]
  ) as genres,
  -- Difficulty/reading_time still live in legacy JSON; surface them when present.
  nullif(b.data ->> 'difficulty', '') as difficulty,
  case
    when (b.data ->> 'reading_time_minutes') ~ '^[0-9]+$'
      then (b.data ->> 'reading_time_minutes')::integer
    else null
  end as reading_time_minutes,
  case
    when (b.data ->> 'total_pages') ~ '^[0-9]+$'
      then (b.data ->> 'total_pages')::integer
    else null
  end as total_pages
from public.books b
left join public.book_genres bg on bg.book_id = b.id
left join public.genres g on g.id = bg.genre_id
group by b.id;

grant select on public.books_catalog to anon, authenticated;

-- ----------------------------------------------------------------------------
-- book_trending: most-touched books over the last 30 days, ranked by distinct readers
-- ----------------------------------------------------------------------------

create or replace view public.book_trending
with (security_invoker = true)
as
select
  ul.book_id,
  count(distinct ul.user_id)::integer as reader_count,
  count(*) filter (where ul.status = 'completed')::integer as completion_count,
  max(ul.updated_at) as last_activity
from public.user_library ul
where ul.updated_at >= now() - interval '30 days'
group by ul.book_id
order by reader_count desc, completion_count desc, last_activity desc;

grant select on public.book_trending to anon, authenticated;
