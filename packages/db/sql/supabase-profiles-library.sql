-- Run this in Supabase SQL Editor before using the post-registration setup and Library screens.
-- The policies keep each user's profile and library private to that authenticated user.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  selected_interests text[] not null default '{}',
  reading_goal text,
  interests_step_done boolean not null default false,
  goal_step_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  status text not null check (status in ('saved', 'in_progress', 'completed')),
  progress jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.profiles enable row level security;
alter table public.user_library enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_library to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own library" on public.user_library;
create policy "Users can read own library"
  on public.user_library
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own library" on public.user_library;
create policy "Users can insert own library"
  on public.user_library
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own library" on public.user_library;
create policy "Users can update own library"
  on public.user_library
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own library" on public.user_library;
create policy "Users can delete own library"
  on public.user_library
  for delete
  to authenticated
  using (auth.uid() = user_id);
