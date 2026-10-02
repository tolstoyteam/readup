create table if not exists public.user_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null default 'in_progress' check (state in ('in_progress', 'completed', 'legacy')),
  challenge text,
  goals text[] not null default '{}'::text[],
  learning_formats text[] not null default '{}'::text[],
  monthly_goal integer check (monthly_goal between 1 and 50),
  streak_goal integer check (streak_goal between 1 and 365),
  reading_time text,
  reminder_time text check (reminder_time is null or reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Run once at rollout. Future Auth users have no row until the app attaches
-- their guest draft (or creates an empty in-progress record).
insert into public.user_onboarding (user_id, state)
select id, 'legacy' from auth.users
on conflict (user_id) do nothing;

alter table public.user_onboarding enable row level security;
grant select, insert, update on public.user_onboarding to authenticated;

create policy "Read own onboarding" on public.user_onboarding
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own onboarding" on public.user_onboarding
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own onboarding" on public.user_onboarding
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
