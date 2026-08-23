-- The generated Supabase types mark RPC params without a SQL DEFAULT as
-- required (non-nullable) strings, since Postgres itself doesn't expose
-- parameter nullability. request_lesson_change's reschedule-only fields
-- (date/start/end time) and the optional reason are genuinely absent for
-- some calls, so switch them to text and use nullif(..., '') to convert an
-- empty string to NULL server-side - the same pattern already used for
-- create_manual_lesson's p_topic.

drop function if exists public.request_lesson_change(uuid, public.change_request_type, date, time, time, text);

create or replace function public.request_lesson_change(
  p_lesson_id uuid,
  p_request_type public.change_request_type,
  p_requested_date text,
  p_requested_start_time text,
  p_requested_end_time text,
  p_reason text
)
returns public.change_requests
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_request public.change_requests;
  v_date date := nullif(p_requested_date, '')::date;
  v_start_time time := nullif(p_requested_start_time, '')::time;
  v_end_time time := nullif(p_requested_end_time, '')::time;
begin
  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found then
    raise exception 'lesson not found';
  end if;
  if v_lesson.status <> 'confirmed' then
    raise exception 'lesson is not confirmed (status: %)', v_lesson.status;
  end if;

  if not exists (
    select 1 from public.lesson_participants lp
    where lp.lesson_id = p_lesson_id
      and (public.owns_student(lp.student_id) or public.is_parent_of(lp.student_id))
  ) then
    raise exception 'not authorized to request a change on this lesson';
  end if;

  if p_request_type = 'reschedule' and (v_date is null or v_start_time is null or v_end_time is null) then
    raise exception 'reschedule requires a requested date, start time, and end time';
  end if;

  insert into public.change_requests (
    lesson_id, requested_by, request_type, requested_date, requested_start_time, requested_end_time, reason
  )
  values (
    p_lesson_id, auth.uid(), p_request_type, v_date, v_start_time, v_end_time, nullif(p_reason, '')
  )
  returning * into v_request;

  update public.lessons set status = 'change_requested' where id = p_lesson_id;

  return v_request;
end;
$$;
