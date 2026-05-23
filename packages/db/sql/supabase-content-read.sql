-- Public/authenticated read access for the relational book content tables.
-- Run this in Supabase SQL Editor after applying drizzle/0001_relational_book_blocks.sql.
-- The books schema itself is unchanged; this only enables RLS + read policies so the mobile
-- app can hit chapters / quizzes / genres via PostgREST.

-- ----------------------------------------------------------------------------
-- Genres + book_genres (public read — used for browse/recommendations)
-- ----------------------------------------------------------------------------

alter table public.genres enable row level security;
alter table public.book_genres enable row level security;

grant select on public.genres to anon, authenticated;
grant select on public.book_genres to anon, authenticated;

drop policy if exists "Allow read genres" on public.genres;
create policy "Allow read genres"
  on public.genres
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow read book_genres" on public.book_genres;
create policy "Allow read book_genres"
  on public.book_genres
  for select
  to anon, authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- Chapters + blocks (authenticated read)
-- ----------------------------------------------------------------------------

alter table public.chapters enable row level security;
alter table public.chapter_blocks enable row level security;

grant select on public.chapters to authenticated;
grant select on public.chapter_blocks to authenticated;

drop policy if exists "Allow read chapters" on public.chapters;
create policy "Allow read chapters"
  on public.chapters
  for select
  to authenticated
  using (true);

drop policy if exists "Allow read chapter_blocks" on public.chapter_blocks;
create policy "Allow read chapter_blocks"
  on public.chapter_blocks
  for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- Quizzes + questions + answers (authenticated read)
-- ----------------------------------------------------------------------------

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;

grant select on public.quizzes to authenticated;
grant select on public.quiz_questions to authenticated;
grant select on public.quiz_answers to authenticated;

drop policy if exists "Allow read quizzes" on public.quizzes;
create policy "Allow read quizzes"
  on public.quizzes
  for select
  to authenticated
  using (true);

drop policy if exists "Allow read quiz_questions" on public.quiz_questions;
create policy "Allow read quiz_questions"
  on public.quiz_questions
  for select
  to authenticated
  using (true);

drop policy if exists "Allow read quiz_answers" on public.quiz_answers;
create policy "Allow read quiz_answers"
  on public.quiz_answers
  for select
  to authenticated
  using (true);
