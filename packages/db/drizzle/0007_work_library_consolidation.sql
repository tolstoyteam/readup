-- Consolidate edition-keyed user_library rows into work-keyed user_work_library.
-- Adds work_id to quiz attempts and touched_work_ids to daily reading log.

alter table public.user_quiz_attempts
  add column if not exists work_id uuid references public.book_works(id) on delete set null;

create index if not exists user_quiz_attempts_work_id_idx
  on public.user_quiz_attempts(user_id, work_id);

update public.user_quiz_attempts uqa
set work_id = b.work_id
from public.books b
where b.id::text = uqa.book_id
  and uqa.work_id is null;

alter table public.reading_daily_log
  add column if not exists touched_work_ids jsonb not null default '[]'::jsonb;

-- Merge all edition rows per (user_id, work_id) into user_work_library.
with edition_rows as (
  select
    ul.user_id,
    b.work_id,
    ul.book_id,
    b.id as edition_id,
    b.language,
    ul.is_saved,
    ul.reading_status,
    ul.progress,
    ul.created_at,
    ul.updated_at,
    coalesce((ul.progress ->> 'page')::integer, 0) as progress_page,
    case ul.reading_status
      when 'completed' then 3
      when 'in_progress' then 2
      else 1
    end as status_rank
  from public.user_library ul
  join public.books b on b.id::text = ul.book_id
  where b.work_id is not null
),
winning as (
  select distinct on (user_id, work_id)
    user_id,
    work_id,
    edition_id,
    language,
    is_saved,
    reading_status,
    progress,
    created_at,
    updated_at,
    book_id
  from edition_rows
  order by user_id, work_id, status_rank desc, progress_page desc, updated_at desc
),
merged as (
  select
    er.user_id,
    er.work_id,
    bool_or(er.is_saved) as is_saved,
    case
      when bool_or(er.reading_status = 'completed') then 'completed'
      when bool_or(er.reading_status = 'in_progress') then 'in_progress'
      else 'not_started'
    end as reading_status,
    w.progress,
    w.edition_id as last_edition_id,
    w.language as preferred_language,
    w.book_id as winning_book_id,
    min(er.created_at) as created_at,
    max(er.updated_at) as updated_at
  from edition_rows er
  join winning w on w.user_id = er.user_id and w.work_id = er.work_id
  group by
    er.user_id,
    er.work_id,
    w.progress,
    w.edition_id,
    w.language,
    w.book_id
)
insert into public.user_work_library (
  user_id,
  work_id,
  last_edition_id,
  preferred_language,
  is_saved,
  reading_status,
  progress,
  created_at,
  updated_at
)
select
  m.user_id,
  m.work_id,
  m.last_edition_id,
  m.preferred_language,
  m.is_saved,
  m.reading_status,
  coalesce(m.progress, '{}'::jsonb) || jsonb_build_object(
    'edition_book_id', m.winning_book_id
  ),
  m.created_at,
  m.updated_at
from merged m
on conflict (user_id, work_id) do update
  set last_edition_id = excluded.last_edition_id,
      preferred_language = excluded.preferred_language,
      is_saved = excluded.is_saved,
      reading_status = excluded.reading_status,
      progress = excluded.progress,
      updated_at = excluded.updated_at;

-- Remove edition-keyed library rows that were merged into user_work_library.
delete from public.user_library ul
using public.books b
where b.id::text = ul.book_id
  and b.work_id is not null
  and exists (
    select 1
    from public.user_work_library uwl
    where uwl.user_id = ul.user_id
      and uwl.work_id = b.work_id
  );

-- Reconcile completion counts per user (distinct works).
update public.profiles p
set total_books_completed = sub.cnt,
    updated_at = now()
from (
  select
    uwl.user_id,
    count(*)::integer as cnt
  from public.user_work_library uwl
  where uwl.reading_status = 'completed'
  group by uwl.user_id
) sub
where p.id = sub.user_id
  and p.total_books_completed is distinct from sub.cnt;
