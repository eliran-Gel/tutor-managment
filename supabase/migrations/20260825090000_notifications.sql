-- Phase 12 (scoped): in-app notifications. A tutor cancelled a real
-- lesson and the student had no way to know except noticing the status
-- change themselves. This adds a notifications table + bell UI; web push
-- is a deliberately separate, larger follow-up (no service worker / VAPID
-- infra exists yet).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles (id),
  type text not null,
  title text not null,
  body text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx on public.notifications (recipient_profile_id, read_at);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_profile_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());

-- No insert policy at all - every row is written from inside a security
-- definer RPC (owner bypasses RLS), never directly by a client. Mirrors
-- request_lesson_change's reasoning in
-- 20260823091500_change_requests_security_definer.sql.

-- RLS's WITH CHECK only ever sees the NEW row, never OLD, so "only
-- read_at may change" isn't expressible in WITH CHECK alone - same
-- reasoning as restrict_student_self_update() in
-- 20260822141500_student_self_update_grade_school.sql.
create or replace function public.restrict_notification_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.link_path is distinct from old.link_path
     or new.recipient_profile_id is distinct from old.recipient_profile_id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'notifications may only have read_at updated';
  end if;
  return new;
end;
$$;

create trigger notifications_restrict_self_update
  before update on public.notifications
  for each row execute function public.restrict_notification_self_update();

-- Realtime: this repo has never used it before, so the table needs to be
-- explicitly added to the publication. postgres_changes evaluates the
-- connecting JWT against notifications_select_own itself, so this isn't
-- an added privacy surface.
alter publication supabase_realtime add table public.notifications;

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
  insert into public.notifications (recipient_profile_id, type, title, body, link_path)
  values (p_recipient, p_type, p_title, p_body, p_link_path);
end;
$$;

-- approve_lesson_request: add a notification to the requester on approval.
create or replace function public.approve_lesson_request(target_lesson_id uuid)
returns public.lessons
language plpgsql
security invoker
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

-- Replaces the direct .update() the server action used to do - the only
-- one of the "tutor decides" actions that wasn't already an RPC. Needed
-- so it can notify the requester in the same transaction.
create or replace function public.reject_lesson_request(target_lesson_id uuid)
returns public.lessons
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can reject requests';
  end if;

  update public.lessons set status = 'rejected'
  where id = target_lesson_id and status = 'requested'
  returning * into v_lesson;

  if not found then
    raise exception 'lesson not found or not pending';
  end if;

  perform public.create_notification(
    v_lesson.created_by, 'lesson_rejected', 'הבקשה לשיעור נדחתה',
    'הבקשה לשיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || ' נדחתה.',
    '/portal/lessons'
  );

  return v_lesson;
end;
$$;

-- cancel_lesson: notify every participant who has a real account (guests
-- have no profile_id, and thus no login to notify).
create or replace function public.cancel_lesson(target_lesson_id uuid)
returns public.lessons
language plpgsql
security invoker
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

-- Replaces the direct .insert() the server action used to do, so the
-- tutor can be notified of the new request in the same transaction. Same
-- fields/validation the existing Zod schema in requestLesson already
-- enforces client-side; RLS's lessons_insert_own_request stays the real
-- floor regardless.
create or replace function public.request_lesson(
  p_date date,
  p_start_time time,
  p_end_time time,
  p_duration_minutes int,
  p_delivery_mode public.delivery_mode,
  p_subject_id uuid,
  p_topic text
)
returns public.lessons
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_tutor_id uuid;
begin
  insert into public.lessons (
    date, start_time, end_time, duration_minutes, lesson_type, delivery_mode,
    subject_id, topic, status, source, forced, created_by
  ) values (
    p_date, p_start_time, p_end_time, p_duration_minutes, 'individual', p_delivery_mode,
    p_subject_id, nullif(p_topic, ''), 'requested', 'student_request', false, auth.uid()
  ) returning * into v_lesson;

  for v_tutor_id in select id from public.profiles where role = 'tutor' loop
    perform public.create_notification(
      v_tutor_id, 'lesson_requested', 'בקשה חדשה לשיעור',
      'התקבלה בקשה לשיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || '.',
      '/tutor/requests'
    );
  end loop;

  return v_lesson;
end;
$$;

-- create_manual_lesson: notify each participant who has a real account.
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
security invoker
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

-- request_lesson_change: notify the tutor of the new change request.
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
  v_tutor_id uuid;
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

  for v_tutor_id in select id from public.profiles where role = 'tutor' loop
    perform public.create_notification(
      v_tutor_id, 'change_requested', 'בקשת שינוי חדשה',
      case when p_request_type = 'cancel' then 'התקבלה בקשת ביטול לשיעור.' else 'התקבלה בקשת דחייה לשיעור.' end,
      '/tutor/requests'
    );
  end loop;

  return v_request;
end;
$$;

-- approve_change_request / reject_change_request: notify the requester.
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

  perform public.create_notification(
    v_request.requested_by, 'change_rejected', 'בקשת השינוי נדחתה',
    case when v_request.request_type = 'cancel' then 'בקשת הביטול שלך נדחתה, השיעור נשאר כפי שהיה.' else 'בקשת הדחייה שלך נדחתה, השיעור נשאר כפי שהיה.' end,
    '/portal/lessons'
  );

  return v_request;
end;
$$;
