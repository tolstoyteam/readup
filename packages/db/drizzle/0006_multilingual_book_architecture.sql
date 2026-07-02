-- Multilingual book architecture.
-- The existing public.books table remains the physical edition table during
-- migration so current numeric book ids keep working for mobile/admin clients.

create extension if not exists pgcrypto;

create table if not exists public.book_works (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books
  add column if not exists work_id uuid,
  add column if not exists status text not null default 'draft',
  add column if not exists source_edition_id integer references public.books(id) on delete set null,
  add column if not exists translation_error text,
  add column if not exists tts_error text,
  add column if not exists generation_metadata jsonb,
  add column if not exists published_at timestamptz;

alter table public.books
  drop constraint if exists books_status_check;

alter table public.books
  add constraint books_status_check
  check (status in ('draft', 'generating', 'translating', 'generating_tts', 'published', 'failed'));

insert into public.book_works (id, slug, cover_image_url, created_at, updated_at)
select
  gen_random_uuid(),
  'book-' || b.id::text,
  b.cover_image_url,
  now(),
  now()
from public.books b
where b.work_id is null;

update public.books b
set work_id = w.id,
    status = case when b.status = 'draft' then 'published' else b.status end,
    published_at = coalesce(b.published_at, now())
from public.book_works w
where b.work_id is null
  and w.slug = 'book-' || b.id::text;

alter table public.books
  alter column work_id set not null;

alter table public.books
  drop constraint if exists books_work_id_fkey;

alter table public.books
  add constraint books_work_id_fkey
  foreign key (work_id) references public.book_works(id) on delete cascade;

create index if not exists books_work_id_idx on public.books(work_id);
create index if not exists books_status_idx on public.books(status);
create unique index if not exists books_work_language_unique on public.books(work_id, language);

alter table public.chapters
  add column if not exists stable_id uuid not null default gen_random_uuid();

alter table public.chapter_blocks
  add column if not exists stable_id uuid not null default gen_random_uuid();

create index if not exists chapters_stable_id_idx on public.chapters(stable_id);
create index if not exists chapter_blocks_stable_id_idx on public.chapter_blocks(stable_id);

create table if not exists public.user_work_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.book_works(id) on delete cascade,
  last_edition_id integer references public.books(id) on delete set null,
  preferred_language varchar(32),
  is_saved boolean not null default false,
  reading_status text not null default 'not_started',
  progress jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, work_id),
  constraint user_work_library_reading_status_check
    check (reading_status in ('not_started', 'in_progress', 'completed'))
);

create index if not exists user_work_library_last_edition_idx
  on public.user_work_library(last_edition_id);

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
select distinct on (ul.user_id, b.work_id)
  ul.user_id,
  b.work_id,
  b.id,
  b.language,
  ul.is_saved,
  ul.reading_status,
  coalesce(ul.progress, '{}'::jsonb) || jsonb_build_object('edition_book_id', ul.book_id),
  ul.created_at,
  ul.updated_at
from public.user_library ul
join public.books b on b.id::text = ul.book_id
order by ul.user_id, b.work_id, ul.updated_at desc
on conflict (user_id, work_id) do nothing;

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.book_works(id) on delete cascade,
  edition_id integer references public.books(id) on delete cascade,
  type text not null,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generation_jobs_type_check check (type in ('translation', 'tts')),
  constraint generation_jobs_status_check check (status in ('queued', 'running', 'succeeded', 'failed'))
);

create index if not exists generation_jobs_work_id_idx on public.generation_jobs(work_id);
create index if not exists generation_jobs_edition_id_idx on public.generation_jobs(edition_id);
create index if not exists generation_jobs_status_idx on public.generation_jobs(status);
