-- Switch push delivery from Expo Push Service tokens to native APNs device tokens.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_push_tokens'
      and column_name = 'expo_push_token'
  ) then
    alter table public.user_push_tokens
      rename column expo_push_token to push_token;
  end if;
end $$;

alter table public.user_push_tokens
  add column if not exists provider text not null default 'apns',
  add column if not exists apns_environment text not null default 'production';

alter table public.user_push_tokens
  drop constraint if exists user_push_tokens_user_token_unique,
  add constraint user_push_tokens_user_token_unique unique (user_id, push_token);

alter table public.user_push_tokens
  drop constraint if exists user_push_tokens_provider_check,
  add constraint user_push_tokens_provider_check check (provider in ('apns')),
  drop constraint if exists user_push_tokens_apns_environment_check,
  add constraint user_push_tokens_apns_environment_check
    check (apns_environment in ('sandbox', 'production'));
