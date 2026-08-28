-- Named-argument calls to extensions.http_post kept failing to resolve to
-- any overload regardless of casts - fall back to the plain positional
-- signature (url, body, params, headers, timeout_milliseconds), which is
-- what every pg_net example in Supabase's own docs actually uses.
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
    'https://onuaaeiokqcwefvumdoe.supabase.co/functions/v1/send-push-notification',
    jsonb_build_object(
      'profile_id', new.recipient_profile_id,
      'title', new.title,
      'body', new.body,
      'link_path', new.link_path
    ),
    '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'x-push-trigger-secret', v_secret)
  );
  return new;
end;
$$;
