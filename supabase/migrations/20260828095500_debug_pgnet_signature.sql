create or replace function public.debug_pgnet_signature()
returns table (schema_name text, function_name text, arg_types text)
language sql
security definer
set search_path = public
as $$
  select n.nspname::text, p.proname::text, pg_get_function_arguments(p.oid)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'http_post';
$$;

revoke execute on function public.debug_pgnet_signature() from public;
revoke execute on function public.debug_pgnet_signature() from anon;
revoke execute on function public.debug_pgnet_signature() from authenticated;
