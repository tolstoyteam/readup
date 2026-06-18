-- Remove partial engagement-remediation artifacts that can break the committed
-- 5-parameter record_reading_session API and block user_library updates.
-- Safe to run repeatedly (IF EXISTS).

-- Remediation RPC overloads
drop function if exists public.record_reading_session(text, integer, integer, date, integer, integer);
drop function if exists public._maybe_unlock_achievements(uuid, date);
drop function if exists public.effective_streak_days(integer, date, date);

-- Remediation triggers (not present in committed engagement-rls.sql)
drop trigger if exists trg_profiles_protect_engagement_stats on public.profiles;
drop trigger if exists trg_user_library_protect_progress on public.user_library;
drop function if exists public.profiles_protect_engagement_stats();
drop function if exists public.user_library_protect_progress();
