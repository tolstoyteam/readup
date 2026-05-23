-- Engagement & personalization layer (MVP Phase 1).
-- Books schema is intentionally frozen — this migration only adds user/engagement tables,
-- extends `profiles`, and creates views/RPCs that read from the existing book model.

-- ============================================================================
-- 1. Profiles: premium flag, streak, stats, notification prefs
-- ============================================================================

alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists current_streak_days integer not null default 0,
  add column if not exists longest_streak_days integer not null default 0,
  add column if not exists last_read_date date,
  add column if not exists total_books_completed integer not null default 0,
  add column if not exists total_reading_minutes integer not null default 0,
  add column if not exists daily_reading_goal_minutes integer not null default 5,
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

-- ============================================================================
-- 2. user_search_history
-- ============================================================================

create table if not exists public.user_search_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  searched_at timestamptz not null default now(),
  primary key (user_id, query)
);

create index if not exists user_search_history_searched_at_idx
  on public.user_search_history (user_id, searched_at desc);

-- ============================================================================
-- 3. user_quiz_attempts
-- ============================================================================

create table if not exists public.user_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  quiz_id integer not null references public.quizzes(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  answers jsonb not null,
  completed_at timestamptz not null default now()
);

create index if not exists user_quiz_attempts_user_book_idx
  on public.user_quiz_attempts (user_id, book_id, completed_at desc);

-- ============================================================================
-- 4. Achievements (catalog) + user unlocks
-- ============================================================================

create table if not exists public.achievements (
  id serial primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  icon text not null,
  sort_order integer not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id integer not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ============================================================================
-- 5. user_notifications (in-app feed)
-- ============================================================================

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in ('streak_reminder', 'new_content', 'quiz_reminder', 'achievement', 'daily_reading')
  ),
  title text not null,
  body text not null,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

-- ============================================================================
-- 6. reading_daily_log (charts + streak source)
-- ============================================================================

create table if not exists public.reading_daily_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  minutes_read integer not null default 0,
  books_touched integer not null default 0,
  primary key (user_id, activity_date)
);
