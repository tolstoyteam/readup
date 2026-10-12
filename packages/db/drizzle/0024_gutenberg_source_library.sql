-- Private source library: fetching books is independent of publishing app editions.
create table if not exists public.gutenberg_source_books (
  gutenberg_id integer primary key,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  bookshelves jsonb not null default '[]'::jsonb,
  subjects jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  media_type text,
  download_count integer not null default 0,
  issued text,
  cover_image_url text,
  gutenberg_url text,
  raw_book jsonb not null,
  cleaned_text text,
  text_status text not null default 'pending',
  text_error text,
  text_source text,
  cleaning_mode text,
  text_metadata jsonb,
  text_length integer,
  text_sha256 text,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gutenberg_source_books_text_status_check
    check (text_status in ('pending', 'ready', 'failed'))
);

create index if not exists gutenberg_source_books_text_status_idx
  on public.gutenberg_source_books (text_status);

create table if not exists public.gutenberg_collection_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued',
  requested_count integer not null,
  saved_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  filters jsonb not null default '{}'::jsonb,
  cursor jsonb not null default '{}'::jsonb,
  created_by uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gutenberg_collection_jobs_status_check
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  constraint gutenberg_collection_jobs_count_check
    check (requested_count >= 1 and requested_count <= 100)
);

create index if not exists gutenberg_collection_jobs_status_idx
  on public.gutenberg_collection_jobs (status);

-- Only server-side, admin-authenticated handlers may access these tables.
alter table public.gutenberg_source_books enable row level security;
alter table public.gutenberg_collection_jobs enable row level security;
