-- Read-only views derived from the existing books schema. No ALTER TABLE on books.
-- All views use security_invoker so they respect the caller's RLS on underlying tables.

-- ----------------------------------------------------------------------------
-- books_catalog: flat row per book with comma-joined genres for cheap mobile reads
-- ----------------------------------------------------------------------------

drop view if exists public.books_catalog;

create or replace view public.books_catalog
with (security_invoker = true)
as
select
  b.id,
  b.id::text as book_id,
  b.work_id,
  b.title,
  b.author,
  b.language,
  coalesce(w.cover_image_url, b.cover_image_url) as cover_image_url,
  b.keywords,
  coalesce(
    array_agg(g.name_ru order by g.name_ru) filter (where g.name_ru is not null),
    array[]::text[]
  ) as genres,
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
join public.book_works w on w.id = b.work_id
left join public.book_genres bg on bg.book_id = b.id
left join public.genres g on g.id = bg.genre_id
where b.status = 'published'
group by b.id, w.cover_image_url;

grant select on public.books_catalog to anon, authenticated;

-- ----------------------------------------------------------------------------
-- user_work_library_enriched: work-level library rows for mobile reads
-- ----------------------------------------------------------------------------

drop view if exists public.user_work_library_enriched;

create or replace view public.user_work_library_enriched
with (security_invoker = true)
as
select
  uwl.user_id,
  uwl.work_id,
  uwl.work_id::text as work_id_text,
  uwl.last_edition_id,
  uwl.last_edition_id::text as last_edition_book_id,
  uwl.preferred_language,
  uwl.is_saved,
  uwl.reading_status,
  uwl.progress,
  uwl.created_at,
  uwl.updated_at
from public.user_work_library uwl;

grant select on public.user_work_library_enriched to authenticated;

-- ----------------------------------------------------------------------------
-- book_trending: most-touched works over the last 30 days
-- ----------------------------------------------------------------------------

drop view if exists public.book_trending;

create or replace view public.book_trending
with (security_invoker = true)
as
select
  uwl.work_id::text as work_id,
  coalesce(max(uwl.last_edition_id)::text, max(b.id)::text) as book_id,
  count(distinct uwl.user_id)::integer as reader_count,
  count(*) filter (where uwl.reading_status = 'completed')::integer as completion_count,
  max(uwl.updated_at) as last_activity
from public.user_work_library uwl
left join public.books b on b.id = uwl.last_edition_id
where uwl.updated_at >= now() - interval '30 days'
group by uwl.work_id
order by reader_count desc, completion_count desc, last_activity desc;

grant select on public.book_trending to anon, authenticated;
