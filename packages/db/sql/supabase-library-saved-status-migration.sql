-- One-time migration: split user_library.status into is_saved + reading_status.
-- Safe to run on databases that already have the new columns (no-op).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_library'
      and column_name = 'status'
  ) then
    alter table public.user_library
      add column if not exists is_saved boolean not null default false;

    alter table public.user_library
      add column if not exists reading_status text;

    update public.user_library
    set
      is_saved = (status = 'saved'),
      reading_status = case status
        when 'saved' then 'not_started'
        when 'in_progress' then 'in_progress'
        when 'completed' then 'completed'
      end
    where reading_status is null;

    alter table public.user_library
      alter column reading_status set default 'not_started';

    alter table public.user_library
      alter column reading_status set not null;

    alter table public.user_library
      drop constraint if exists user_library_status_check;

    alter table public.user_library
      drop column status;

    alter table public.user_library
      drop constraint if exists user_library_reading_status_check;

    alter table public.user_library
      add constraint user_library_reading_status_check
      check (reading_status in ('not_started', 'in_progress', 'completed'));
  end if;
end $$;
