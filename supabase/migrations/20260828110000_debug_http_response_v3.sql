create or replace function public.debug_last_http_response()
returns table (id bigint, status_code int, content text, error_msg text, created timestamptz)
language sql
security definer
set search_path = public, net
as $$
  select id, status_code, content, error_msg, created
  from net._http_response
  order by id desc
  limit 3;
$$;

revoke execute on function public.debug_last_http_response() from public;
revoke execute on function public.debug_last_http_response() from anon;
revoke execute on function public.debug_last_http_response() from authenticated;
