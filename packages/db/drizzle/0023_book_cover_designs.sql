create table if not exists public.book_cover_designs (
  work_id uuid primary key references public.book_works(id) on delete cascade,
  draft_recipe jsonb,
  published_recipe jsonb,
  draft_source_path text,
  published_source_path text,
  published_path text,
  generation_state text not null default 'idle',
  error text,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint book_cover_designs_generation_state_check
    check (generation_state in ('idle', 'generating', 'ready', 'failed'))
);

alter table public.book_cover_designs enable row level security;
revoke all on public.book_cover_designs from anon, authenticated;

-- Original illustrations stay private; only completed covers use the existing cover bucket.
insert into storage.buckets (id, name, public)
values ('book-cover-sources', 'book-cover-sources', false)
on conflict (id) do nothing;
update storage.buckets set public = false where id = 'book-cover-sources';
