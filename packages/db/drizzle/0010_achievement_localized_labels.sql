alter table public.achievements
  add column if not exists title_en text,
  add column if not exists description_en text;
