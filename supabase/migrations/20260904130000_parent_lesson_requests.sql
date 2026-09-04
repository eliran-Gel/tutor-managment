-- Lets a parent request a lesson for their child, not just a student for
-- themselves. request_lesson() previously had no way to know WHICH
-- student a request was for other than "whoever's students row has
-- profile_id = auth.uid()" - fine for a student booking for themselves,
-- completely wrong for a parent (their own profile_id doesn't map to
-- their child's students row at all). This makes the target student
-- explicit at request time instead of inferring it later at approval.
--
-- Old create_manual_lesson overload issue from 20260904110000/121000 is
-- the cautionary tale here: request_lesson's parameter list is changing
-- (one new required param, no default), so the old-shaped function is
-- explicitly dropped in the same migration - never left to linger
-- alongside a `create or replace` with a different signature.

alter table public.lessons add column requested_student_id uuid references public.students (id);

-- A parent could previously never even see their own still-pending
-- request in /portal/lessons - lessons_select_parent only matched via an
-- existing lesson_participants row, which a 'requested' lesson doesn't
-- have yet. Mirrors lessons_select_own's identical `created_by = auth.uid()`
-- branch below.
drop policy if exists "lessons_select_parent" on public.lessons;
create policy "lessons_select_parent"
  on public.lessons for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.lesson_participants lp
      where lp.lesson_id = lessons.id and public.is_parent_of(lp.student_id)
    )
  );

drop function if exists public.request_lesson(
  date, time, time, int, public.delivery_mode, uuid, text
);

create or replace function public.request_lesson(
  p_date date,
  p_start_time time,
  p_end_time time,
  p_duration_minutes int,
  p_delivery_mode public.delivery_mode,
  p_subject_id uuid,
  p_topic text,
  p_student_id uuid
)
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_tutor_id uuid;
begin
  if not (public.owns_student(p_student_id) or public.is_parent_of(p_student_id)) then
    raise exception 'not authorized to request a lesson for this student';
  end if;

  insert into public.lessons (
    date, start_time, end_time, duration_minutes, lesson_type, delivery_mode,
    subject_id, topic, status, source, forced, created_by, requested_student_id
  ) values (
    p_date, p_start_time, p_end_time, p_duration_minutes, 'individual', p_delivery_mode,
    p_subject_id, nullif(p_topic, ''), 'requested', 'student_request', false, auth.uid(), p_student_id
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

-- Resolves the participant from requested_student_id when the request
-- carries one (every request going forward); falls back to the old
-- created_by-based lookup for any pre-existing 'requested' row from
-- before this column existed, so nothing already in the queue breaks.
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

  if v_lesson.requested_student_id is not null then
    select * into v_student from public.students where id = v_lesson.requested_student_id;
  else
    select * into v_student from public.students where profile_id = v_lesson.created_by;
  end if;
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
