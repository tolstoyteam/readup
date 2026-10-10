-- Gutenberg import: dedupe key on works + batch import job/item tables.

alter table public.book_works
  add column if not exists gutenberg_id integer;

create unique index if not exists book_works_gutenberg_id_unique
  on public.book_works (gutenberg_id)
  where gutenberg_id is not null;

create table if not exists public.gutenberg_import_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued',
  requested_count integer not null,
  filters jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{"requested":0,"imported":0,"skipped":0,"failed":0,"processing":0}'::jsonb,
  cursor jsonb not null default '{}'::jsonb,
  created_by uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gutenberg_import_jobs_status_check
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  constraint gutenberg_import_jobs_requested_count_check
    check (requested_count >= 1 and requested_count <= 50)
);

create index if not exists gutenberg_import_jobs_status_idx
  on public.gutenberg_import_jobs (status);

create table if not exists public.gutenberg_import_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.gutenberg_import_jobs(id) on delete cascade,
  gutenberg_id integer not null,
  title text not null,
  author text not null default 'Unknown',
  status text not null default 'waiting',
  work_id uuid references public.book_works(id) on delete set null,
  generation_job_id uuid references public.generation_jobs(id) on delete set null,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gutenberg_import_items_status_check
    check (status in (
      'waiting',
      'fetching',
      'fetched',
      'generating_english',
      'generating_russian',
      'generating_english_tts',
      'generating_russian_tts',
      'saving',
      'completed',
      'skipped',
      'failed'
    ))
);

create unique index if not exists gutenberg_import_items_job_gutenberg_unique
  on public.gutenberg_import_items (job_id, gutenberg_id);

create index if not exists gutenberg_import_items_job_status_idx
  on public.gutenberg_import_items (job_id, status);

create index if not exists gutenberg_import_items_gutenberg_id_idx
  on public.gutenberg_import_items (gutenberg_id);

-- Admin-only via service role / server DB; no anon/authenticated grants.
alter table public.gutenberg_import_jobs enable row level security;
alter table public.gutenberg_import_items enable row level security;
