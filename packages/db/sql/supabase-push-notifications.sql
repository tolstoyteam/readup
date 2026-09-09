-- Push notification token table + RLS policies.

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  enabled boolean not null default true,
  last_registered_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_user_token_unique unique (user_id, expo_push_token)
);

create index if not exists user_push_tokens_user_enabled_idx
  on public.user_push_tokens (user_id, enabled);

alter table public.user_push_tokens enable row level security;
grant select, insert, update, delete on public.user_push_tokens to authenticated;

drop policy if exists "Users can read own push tokens" on public.user_push_tokens;
create policy "Users can read own push tokens"
  on public.user_push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can register own push tokens" on public.user_push_tokens;
create policy "Users can register own push tokens"
  on public.user_push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own push tokens" on public.user_push_tokens;
create policy "Users can update own push tokens"
  on public.user_push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push tokens" on public.user_push_tokens;
create policy "Users can delete own push tokens"
  on public.user_push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);
