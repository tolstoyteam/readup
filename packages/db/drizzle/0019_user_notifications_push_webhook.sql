-- Trigger Expo push delivery whenever an in-app notification is created.
-- Requires a Supabase Vault secret named readup_push_webhook_service_role_key.

create extension if not exists pg_net with schema extensions;

create or replace function public.send_user_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  request_id bigint;
  service_key text;
begin
  select decrypted_secret
    into service_key
  from vault.decrypted_secrets
  where name = 'readup_push_webhook_service_role_key'
  limit 1;

  if service_key is null then
    raise warning 'readup_push_webhook_service_role_key is not configured';
    return new;
  end if;

  select net.http_post(
    url := 'https://zlyqufgqclicteeupijp.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(new),
      'old_record', null
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    timeout_milliseconds := 5000
  ) into request_id;

  return new;
end;
$$;

revoke execute on function public.send_user_notification_push()
  from public, anon, authenticated;

drop trigger if exists send_user_notification_push_on_insert
  on public.user_notifications;

create trigger send_user_notification_push_on_insert
after insert on public.user_notifications
for each row
execute function public.send_user_notification_push();
