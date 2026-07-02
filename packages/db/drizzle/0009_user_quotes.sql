-- User-saved text highlights (quotes) anchored to stable block offsets.

create table if not exists public.user_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.book_works(id) on delete cascade,
  edition_book_id integer not null references public.books(id) on delete cascade,
  language varchar(32) not null,
  chapter_stable_id text not null,
  chapter_title text,
  page_number integer not null,
  block_stable_id text not null,
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null check (end_offset > start_offset),
  selected_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_quotes_user_created_idx
  on public.user_quotes (user_id, created_at desc);

create index if not exists user_quotes_user_edition_chapter_idx
  on public.user_quotes (user_id, edition_book_id, chapter_stable_id);

create unique index if not exists user_quotes_unique_anchor_idx
  on public.user_quotes (user_id, edition_book_id, block_stable_id, start_offset, end_offset);
