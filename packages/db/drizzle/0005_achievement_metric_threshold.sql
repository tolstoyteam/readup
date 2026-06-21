-- Achievements catalog becomes data-driven: metric + threshold columns drive
-- _maybe_unlock_achievements, so new achievements only need a seed row.

alter table public.achievements
  add column if not exists metric text,
  add column if not exists threshold integer;
