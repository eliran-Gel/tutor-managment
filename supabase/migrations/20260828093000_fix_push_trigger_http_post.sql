-- pg_net's http_post couldn't resolve the overload from named arguments
-- alone ("function extensions.http_post(url => unknown, ...) does not
-- exist") - the url literal needs an explicit ::text cast for Postgres to
-- pick the right overload.
create or replace function public.notifications_send_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_trigger_secret';

  perform extensions.http_post(
    url := 'https://onuaaeiokqcwefvumdoe.supabase.co/functions/v1/send-push-notification'::text,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-trigger-secret', v_secret),
    body := jsonb_build_object(
      'profile_id', new.recipient_profile_id,
      'title', new.title,
      'body', new.body,
      'link_path', new.link_path
    )
  );
  return new;
end;
$$;
