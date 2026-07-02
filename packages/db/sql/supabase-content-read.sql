-- Public/authenticated read access for the relational book content tables.
-- Run this in Supabase SQL Editor after applying drizzle/0001_relational_book_blocks.sql.
-- These policies expose only published book editions and their parent works to mobile clients.

-- ----------------------------------------------------------------------------
-- Genres + book_genres (public read — used for browse/recommendations)
-- ----------------------------------------------------------------------------

alter table public.book_works enable row level security;
alter table public.genres enable row level security;
alter table public.book_genres enable row level security;

grant select on public.book_works to anon, authenticated;
grant select on public.genres to anon, authenticated;
grant select on public.book_genres to anon, authenticated;

drop policy if exists "Allow read published book works" on public.book_works;
create policy "Allow read published book works"
  on public.book_works
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.books
      where books.work_id = book_works.id
        and books.status = 'published'
    )
  );

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
  using (
    exists (
      select 1 from public.books
      where books.id = book_genres.book_id
        and books.status = 'published'
    )
  );

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
  using (
    exists (
      select 1 from public.books
      where books.id = chapters.book_id
        and books.status = 'published'
    )
  );

drop policy if exists "Allow read chapter_blocks" on public.chapter_blocks;
create policy "Allow read chapter_blocks"
  on public.chapter_blocks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chapters
      join public.books on books.id = chapters.book_id
      where chapters.id = chapter_blocks.chapter_id
        and books.status = 'published'
    )
  );

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
  using (
    exists (
      select 1 from public.books
      where books.id = quizzes.book_id
        and books.status = 'published'
    )
  );

drop policy if exists "Allow read quiz_questions" on public.quiz_questions;
create policy "Allow read quiz_questions"
  on public.quiz_questions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.quizzes
      join public.books on books.id = quizzes.book_id
      where quizzes.id = quiz_questions.quiz_id
        and books.status = 'published'
    )
  );

drop policy if exists "Allow read quiz_answers" on public.quiz_answers;
create policy "Allow read quiz_answers"
  on public.quiz_answers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.quiz_questions
      join public.quizzes on quizzes.id = quiz_questions.quiz_id
      join public.books on books.id = quizzes.book_id
      where quiz_questions.id = quiz_answers.question_id
        and books.status = 'published'
    )
  );
