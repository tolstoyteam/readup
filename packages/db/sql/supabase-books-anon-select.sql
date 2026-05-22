-- Run in Supabase → SQL Editor if the app shows no books but `SELECT * FROM books` in the SQL editor returns rows.
-- PostgREST uses the `anon` (or `authenticated`) role; with RLS enabled and no SELECT policy, you get 0 rows and no error.

alter table public.books enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.books to anon, authenticated;

drop policy if exists "Allow anon read books" on public.books;

create policy "Allow anon read books"
  on public.books
  for select
  to anon, authenticated
  using (true);
