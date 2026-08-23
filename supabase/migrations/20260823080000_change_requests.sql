-- Phase 7: students/parents can request a reschedule or cancellation on a
-- lesson that's already confirmed, without ever mutating the lesson
-- directly - only the tutor's approval actually changes it. See
-- docs/IMPLEMENTATION_PLAN.md Phase 7 / PRODUCT_SPEC.md.

create type public.change_request_type as enum ('reschedule', 'cancel');
create type public.change_request_status as enum ('pending', 'approved', 'rejected');

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  request_type public.change_request_type not null,
  requested_date date,
  requested_start_time time,
  requested_end_time time,
  reason text,
  status public.change_request_status not null default 'pending',
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint change_requests_reschedule_fields_check check (
    request_type = 'cancel'
    or (requested_date is not null and requested_start_time is not null and requested_end_time is not null)
  )
);

create index change_requests_lesson_idx on public.change_requests (lesson_id);
create index change_requests_status_idx on public.change_requests (status);

alter table public.change_requests enable row level security;

create policy "change_requests_tutor_all"
  on public.change_requests for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "change_requests_select_own"
  on public.change_requests for select
  using (requested_by = auth.uid());

-- Students/parents never get an UPDATE policy here - only INSERT (via the
-- request_lesson_change RPC below) and SELECT of their own requests. Only
-- the tutor can transition a request's status.

-- Submits a reschedule/cancel request: verifies the caller actually owns
-- (or is a parent of) a participant on this lesson, that the lesson is
-- currently confirmed (can't request against a pending/cancelled/completed
-- lesson), records the request, and flags the lesson as change_requested -
-- a status flip, not an edit to its date/time/content.
create or replace function public.request_lesson_change(
  p_lesson_id uuid,
  p_request_type public.change_request_type,
  p_requested_date date,
  p_requested_start_time time,
  p_requested_end_time time,
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

  if p_request_type = 'reschedule'
     and (p_requested_date is null or p_requested_start_time is null or p_requested_end_time is null) then
    raise exception 'reschedule requires a requested date, start time, and end time';
  end if;

  insert into public.change_requests (
    lesson_id, requested_by, request_type, requested_date, requested_start_time, requested_end_time, reason
  )
  values (
    p_lesson_id, auth.uid(), p_request_type, p_requested_date, p_requested_start_time, p_requested_end_time, p_reason
  )
  returning * into v_request;

  update public.lessons set status = 'change_requested' where id = p_lesson_id;

  return v_request;
end;
$$;

-- Approves a pending change request. For a reschedule, re-runs the same
-- overlap check used elsewhere (approve_lesson_request / manual creation)
-- against the *new* time before applying it, so a change request can't
-- silently create a double-booking either.
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

-- Rejects a pending change request: the lesson simply reverts to
-- confirmed, unchanged - the request itself stays on record as rejected.
create or replace function public.reject_change_request(p_request_id uuid)
returns public.change_requests
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_request public.change_requests;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can reject a change request';
  end if;

  select * into v_request from public.change_requests where id = p_request_id for update;
  if not found then
    raise exception 'change request not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'change request is not pending (status: %)', v_request.status;
  end if;

  update public.lessons set status = 'confirmed' where id = v_request.lesson_id;

  update public.change_requests
  set status = 'rejected', resolved_by = auth.uid(), resolved_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
