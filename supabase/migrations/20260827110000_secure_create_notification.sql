-- Security audit finding: create_notification() is `security definer` with
-- no authorization check of its own, and it was never explicitly revoked
-- from PUBLIC - Postgres grants EXECUTE on newly-created functions to
-- PUBLIC by default, and this project never revokes that default. Since
-- PostgREST exposes every function as POST /rest/v1/rpc/<name>, this meant
-- ANY authenticated (or even anonymous) caller could call
-- create_notification directly - bypassing every one of the wrapper RPCs
-- below that are supposed to be the only legitimate path in - and write an
-- arbitrary title/body/link_path to any recipient's notification feed
-- (e.g. a phishing message spoofed to look like a system notification,
-- sent straight to the tutor's own bell).
--
-- Six of the wrapper functions that call create_notification were still
-- `security invoker`, meaning they run as the calling `authenticated`
-- role - so simply revoking EXECUTE from `authenticated` would have broken
-- their own (legitimate) calls to create_notification along with the
-- attack. request_lesson already got converted to `security definer` for
-- an unrelated but analogous bug
-- (20260825091500_fix_request_lesson_notify_definer.sql); each of these
-- six already re-checks is_tutor() (or, for cancel_lesson_request/
-- request_lesson_change, ownership) as its very first statement and never
-- relies on RLS/invoker-role for that gate, so switching them to definer
-- carries the same reasoning and no new exposure.
create or replace function public.approve_lesson_request(target_lesson_id uuid)
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_student public.students;
  v_price numeric(10, 2);
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can approve requests';
  end if;

  select * into v_lesson from public.lessons where id = target_lesson_id for update;
  if not found then
    raise exception 'lesson not found';
  end if;
  if v_lesson.status <> 'requested' then
    raise exception 'lesson is not pending (status: %)', v_lesson.status;
  end if;

  if exists (
    select 1 from public.lessons
    where date = v_lesson.date
      and status = 'confirmed'
      and id <> v_lesson.id
      and start_time < v_lesson.end_time
      and end_time > v_lesson.start_time
  ) then
    raise exception 'overlap_conflict';
  end if;

  select * into v_student from public.students where profile_id = v_lesson.created_by;
  if not found then
    raise exception 'could not resolve the requesting student';
  end if;

  v_price := public.calculate_lesson_price(v_lesson.lesson_type, v_lesson.duration_minutes);

  insert into public.lesson_participants (lesson_id, student_id, price_charged)
  values (target_lesson_id, v_student.id, v_price);

  update public.lessons set status = 'confirmed' where id = target_lesson_id
  returning * into v_lesson;

  perform public.create_notification(
    v_lesson.created_by, 'lesson_approved', 'השיעור אושר',
    'השיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || ' אושר.',
    '/portal/lessons'
  );

  return v_lesson;
end;
$$;

-- The original single-arg overload (20260825090000_notifications.sql) was
-- superseded by the p_reason version below (20260825093000) via a second
-- `create or replace function` with a different parameter list - Postgres
-- treats that as a new overload rather than a true replace, so the old,
-- reason-less, still-security-invoker version has been silently coexisting
-- in the database ever since. Drop it explicitly.
drop function if exists public.reject_lesson_request(uuid);

create or replace function public.reject_lesson_request(target_lesson_id uuid, p_reason text default '')
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_reason text := nullif(p_reason, '');
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can reject requests';
  end if;

  update public.lessons set status = 'rejected', rejection_reason = v_reason
  where id = target_lesson_id and status = 'requested'
  returning * into v_lesson;

  if not found then
    raise exception 'lesson not found or not pending';
  end if;

  perform public.create_notification(
    v_lesson.created_by, 'lesson_rejected', 'הבקשה לשיעור נדחתה',
    'הבקשה לשיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || ' נדחתה.'
      || case when v_reason is not null then ' הערה: ' || v_reason else '' end,
    '/portal/lessons'
  );

  return v_lesson;
end;
$$;

create or replace function public.cancel_lesson(target_lesson_id uuid)
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_recipient uuid;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can cancel a lesson';
  end if;

  update public.lessons set status = 'cancelled'
  where id = target_lesson_id and status = 'confirmed'
  returning * into v_lesson;

  if not found then
    raise exception 'lesson not found or not confirmed';
  end if;

  for v_recipient in
    select s.profile_id from public.lesson_participants lp
    join public.students s on s.id = lp.student_id
    where lp.lesson_id = v_lesson.id and s.profile_id is not null
  loop
    perform public.create_notification(
      v_recipient, 'lesson_cancelled', 'השיעור בוטל',
      'השיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || ' בוטל.',
      '/portal/lessons'
    );
  end loop;

  return v_lesson;
end;
$$;

create or replace function public.create_manual_lesson(
  p_date date,
  p_start_time time,
  p_end_time time,
  p_duration_minutes int,
  p_lesson_type public.lesson_type,
  p_delivery_mode public.delivery_mode,
  p_subject_id uuid,
  p_topic text,
  p_online_url text,
  p_forced boolean,
  p_participants jsonb
)
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_participant jsonb;
  v_count int;
  v_recipient uuid;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can create lessons manually';
  end if;

  v_count := jsonb_array_length(p_participants);
  if v_count < 1 then
    raise exception 'at least one participant is required';
  end if;
  if v_count > 3 then
    raise exception 'a lesson can have at most 3 participants';
  end if;

  insert into public.lessons (
    date, start_time, end_time, duration_minutes, lesson_type, delivery_mode,
    subject_id, topic, online_url, status, source, forced, created_by
  ) values (
    p_date, p_start_time, p_end_time, p_duration_minutes, p_lesson_type, p_delivery_mode,
    p_subject_id, nullif(p_topic, ''), nullif(p_online_url, ''), 'confirmed', 'tutor_manual', p_forced, auth.uid()
  ) returning * into v_lesson;

  for v_participant in select * from jsonb_array_elements(p_participants) loop
    insert into public.lesson_participants (lesson_id, student_id, price_charged)
    values (v_lesson.id, (v_participant ->> 'student_id')::uuid, (v_participant ->> 'price')::numeric);

    select s.profile_id into v_recipient from public.students s where s.id = (v_participant ->> 'student_id')::uuid;
    if v_recipient is not null then
      perform public.create_notification(
        v_recipient, 'lesson_approved', 'נקבע לך שיעור',
        'נקבע לך שיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || '.',
        '/portal/lessons'
      );
    end if;
  end loop;

  return v_lesson;
end;
$$;

create or replace function public.approve_change_request(p_request_id uuid)
returns public.change_requests
language plpgsql
security definer
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

  perform public.create_notification(
    v_request.requested_by, 'change_approved', 'בקשת השינוי אושרה',
    case when v_request.request_type = 'cancel' then 'בקשת הביטול שלך אושרה.' else 'בקשת הדחייה שלך אושרה.' end,
    '/portal/lessons'
  );

  return v_request;
end;
$$;

create or replace function public.reject_change_request(p_request_id uuid)
returns public.change_requests
language plpgsql
security definer
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

  perform public.create_notification(
    v_request.requested_by, 'change_rejected', 'בקשת השינוי נדחתה',
    case when v_request.request_type = 'cancel' then 'בקשת הביטול שלך נדחתה, השיעור נשאר כפי שהיה.' else 'בקשת הדחייה שלך נדחתה, השיעור נשאר כפי שהיה.' end,
    '/portal/lessons'
  );

  return v_request;
end;
$$;

-- Defense in depth: even with every legitimate caller now running as
-- definer (bypassing the EXECUTE check below), also constrain who
-- create_notification will actually write to, in case a future migration
-- ever adds another security-invoker caller without noticing this
-- function's real contract. A non-tutor may only ever notify the (single)
-- tutor - matches every non-tutor-initiated call site above
-- (request_lesson, cancel_lesson_request, request_lesson_change).
create or replace function public.create_notification(
  p_recipient uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tutor() and not exists (
    select 1 from public.profiles where id = p_recipient and role = 'tutor'
  ) then
    raise exception 'not authorized to notify this recipient';
  end if;

  insert into public.notifications (recipient_profile_id, type, title, body, link_path)
  values (p_recipient, p_type, p_title, p_body, p_link_path);
end;
$$;

-- The real fix: this function must never be reachable directly through
-- PostgREST (POST /rest/v1/rpc/create_notification). Every legitimate
-- caller above now runs as security definer (i.e. as this function's
-- owner, typically a superuser role that bypasses EXECUTE checks
-- entirely), so revoking the default PUBLIC grant closes direct access
-- without touching any real call path.
revoke execute on function public.create_notification(uuid, text, text, text, text) from public;
revoke execute on function public.create_notification(uuid, text, text, text, text) from anon;
revoke execute on function public.create_notification(uuid, text, text, text, text) from authenticated;
