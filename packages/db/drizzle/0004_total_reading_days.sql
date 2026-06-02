-- Total unique reading days counter on profiles.
alter table public.profiles
  add column if not exists total_reading_days integer not null default 0;

-- Backfill from existing daily log rows.
update public.profiles p
set total_reading_days = sub.cnt
from (
  select user_id, count(*)::integer as cnt
  from public.reading_daily_log
  group by user_id
) sub
where p.id = sub.user_id;
