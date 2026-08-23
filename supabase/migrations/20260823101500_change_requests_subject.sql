-- Live testing found that a reschedule request had no way to also ask for
-- a subject change - only date/time. Add an optional requested_subject_id;
-- when set and the request is approved, the lesson's subject changes along
-- with (or instead of) its date/time. Left null, the subject is untouched,
-- matching the previous behavior exactly.

alter table public.change_requests
  add column requested_subject_id uuid references public.subjects (id);

drop function if exists public.request_lesson_change(uuid, public.change_request_type, text, text, text, text);

create or replace function public.request_lesson_change(
  p_lesson_id uuid,
  p_request_type public.change_request_type,
  p_requested_date text,
  p_requested_start_time text,
  p_requested_end_time text,
  p_requested_subject_id text,
  p_reason text
)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_request public.change_requests;
  v_date date := nullif(p_requested_date, '')::date;
  v_start_time time := nullif(p_requested_start_time, '')::time;
  v_end_time time := nullif(p_requested_end_time, '')::time;
  v_subject_id uuid := nullif(p_requested_subject_id, '')::uuid;
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
    lesson_id, requested_by, request_type, requested_date, requested_start_time, requested_end_time,
    requested_subject_id, reason
  )
  values (
    p_lesson_id, auth.uid(), p_request_type, v_date, v_start_time, v_end_time, v_subject_id, nullif(p_reason, '')
  )
  returning * into v_request;

  update public.lessons set status = 'change_requested' where id = p_lesson_id;

  return v_request;
end;
$$;

create or replace function public.approve_change_request(p_request_id uuid)
returns public.change_requests
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_request public.change_requests;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can approve a change request';
  end if;

  select * into v_request from public.change_requests where id = p_request_id for update;
  if not found then
    raise exception 'change request not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'change request is not pending (status: %)', v_request.status;
  end if;

  if v_request.request_type = 'cancel' then
    update public.lessons set status = 'cancelled' where id = v_request.lesson_id;
  else
    if exists (
      select 1 from public.lessons l
      where l.date = v_request.requested_date
        and l.status = 'confirmed'
        and l.id <> v_request.lesson_id
        and l.start_time < v_request.requested_end_time
        and l.end_time > v_request.requested_start_time
    ) then
      raise exception 'overlap_conflict';
    end if;

    update public.lessons
    set date = v_request.requested_date,
        start_time = v_request.requested_start_time,
        end_time = v_request.requested_end_time,
        subject_id = coalesce(v_request.requested_subject_id, subject_id),
        status = 'confirmed'
    where id = v_request.lesson_id;
  end if;

  update public.change_requests
  set status = 'approved', resolved_by = auth.uid(), resolved_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
