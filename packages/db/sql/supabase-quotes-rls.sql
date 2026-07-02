-- RLS + grants for user_quotes (saved text highlights).

alter table public.user_quotes enable row level security;
grant select, insert, delete on public.user_quotes to authenticated;

drop policy if exists "Users can read own quotes" on public.user_quotes;
create policy "Users can read own quotes"
  on public.user_quotes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own quotes" on public.user_quotes;
create policy "Users can insert own quotes"
  on public.user_quotes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own quotes" on public.user_quotes;
create policy "Users can delete own quotes"
  on public.user_quotes
  for delete
  to authenticated
  using (auth.uid() = user_id);
