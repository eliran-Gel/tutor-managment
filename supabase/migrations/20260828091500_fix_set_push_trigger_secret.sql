-- vault.secrets rejects a raw UPDATE even from a security definer function
-- (encryption is handled by the vault.update_secret() wrapper, not by
-- writing the column directly) - "permission denied for table secrets".
create or replace function public.set_push_trigger_secret(p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'push_trigger_secret';
  perform vault.update_secret(v_id, p_value);
end;
$$;
