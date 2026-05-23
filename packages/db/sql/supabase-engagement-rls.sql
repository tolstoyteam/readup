-- RLS + grants for the engagement layer tables introduced in 0002_engagement_layer.sql.
-- Pattern: authenticated user can read & write their own rows. Catalog tables (achievements)
-- are publicly readable but only the service role can insert/update.

-- ----------------------------------------------------------------------------
-- profiles: protect is_premium so end users cannot escalate themselves.
-- We keep the existing per-user policies and add a BEFORE UPDATE trigger that
-- snaps is_premium back to its previous value unless the caller is service_role.
-- ----------------------------------------------------------------------------

create or replace function public.profiles_protect_is_premium()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and (auth.role() is null or auth.role() <> 'service_role')
     and new.is_premium is distinct from old.is_premium then
    new.is_premium := old.is_premium;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_is_premium on public.profiles;
create trigger trg_profiles_protect_is_premium
  before update on public.profiles
  for each row
  execute function public.profiles_protect_is_premium();

-- ----------------------------------------------------------------------------
-- user_search_history
-- ----------------------------------------------------------------------------

alter table public.user_search_history enable row level security;
grant select, insert, update, delete on public.user_search_history to authenticated;

drop policy if exists "Users can read own search history" on public.user_search_history;
create policy "Users can read own search history"
  on public.user_search_history
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own search history" on public.user_search_history;
create policy "Users can insert own search history"
  on public.user_search_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own search history" on public.user_search_history;
create policy "Users can update own search history"
  on public.user_search_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own search history" on public.user_search_history;
create policy "Users can delete own search history"
  on public.user_search_history
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- user_quiz_attempts
-- ----------------------------------------------------------------------------

alter table public.user_quiz_attempts enable row level security;
grant select, insert on public.user_quiz_attempts to authenticated;

drop policy if exists "Users can read own quiz attempts" on public.user_quiz_attempts;
create policy "Users can read own quiz attempts"
  on public.user_quiz_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own quiz attempts" on public.user_quiz_attempts;
create policy "Users can insert own quiz attempts"
  on public.user_quiz_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- achievements (catalog, read-only for clients)
-- ----------------------------------------------------------------------------

alter table public.achievements enable row level security;
grant select on public.achievements to anon, authenticated;

drop policy if exists "Allow read achievements" on public.achievements;
create policy "Allow read achievements"
  on public.achievements
  for select
  to anon, authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- user_achievements
-- ----------------------------------------------------------------------------

alter table public.user_achievements enable row level security;
grant select on public.user_achievements to authenticated;

drop policy if exists "Users can read own achievements" on public.user_achievements;
create policy "Users can read own achievements"
  on public.user_achievements
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT happens through SECURITY DEFINER functions / triggers only, no client policy.

-- ----------------------------------------------------------------------------
-- user_notifications
-- ----------------------------------------------------------------------------

alter table public.user_notifications enable row level security;
grant select, update on public.user_notifications to authenticated;

drop policy if exists "Users can read own notifications" on public.user_notifications;
create policy "Users can read own notifications"
  on public.user_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read" on public.user_notifications;
create policy "Users can mark own notifications read"
  on public.user_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT comes from triggers / edge functions running as service_role, no client policy.

-- ----------------------------------------------------------------------------
-- reading_daily_log
-- ----------------------------------------------------------------------------

alter table public.reading_daily_log enable row level security;
grant select on public.reading_daily_log to authenticated;

drop policy if exists "Users can read own reading log" on public.reading_daily_log;
create policy "Users can read own reading log"
  on public.reading_daily_log
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes happen through SECURITY DEFINER RPCs (record_reading_session), not direct client.
