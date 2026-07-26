-- Admin app authorization allowlist.
-- Run this in Supabase SQL Editor, then insert the Supabase Auth user ids that
-- should be allowed to use the admin panel.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon, authenticated;

-- Bootstrap example:
-- insert into public.admin_users (user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
