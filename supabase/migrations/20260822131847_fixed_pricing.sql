-- Product decision (from real usage): pricing is no longer negotiated per
-- student. It's a fixed table by lesson type and duration:
--   individual: 60min=140, 90min=210, 120min=280 (i.e. 140/hour)
--   group:      60min=110, 90min=165, 120min=220 (i.e. 110/hour)
-- This replaces students.default_price as the price source. The column
-- itself is left in place (unused) rather than dropped - low risk to
-- leave, and re-adding it later would be needless churn if a per-student
-- override is ever wanted again.
create or replace function public.calculate_lesson_price(
  p_lesson_type public.lesson_type,
  p_duration_minutes int
)
returns numeric(10, 2)
language sql
immutable
as $$
  select case p_lesson_type
    when 'individual' then case p_duration_minutes
      when 60 then 140
      when 90 then 210
      when 120 then 280
      else round(140.0 * p_duration_minutes / 60, 2)
    end
    when 'group' then case p_duration_minutes
      when 60 then 110
      when 90 then 165
      when 120 then 220
      else round(110.0 * p_duration_minutes / 60, 2)
    end
  end;
$$;

-- Approving a request no longer depends on the student having a
-- default_price set - the price is always computable from the fixed
-- table, so the "set a price before approving" failure mode is gone.
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

  select * into v_student from public.students where profile_id = v_lesson.created_by;
  if not found then
    raise exception 'could not resolve the requesting student';
  end if;

  v_price := public.calculate_lesson_price(v_lesson.lesson_type, v_lesson.duration_minutes);

  insert into public.lesson_participants (lesson_id, student_id, price_charged)
  values (target_lesson_id, v_student.id, v_price);

  update public.lessons set status = 'confirmed' where id = target_lesson_id
  returning * into v_lesson;

  return v_lesson;
end;
$$;

-- create_manual_lesson now takes plain student ids (no client-supplied
-- price) and applies the same fixed-table price to every participant.
drop function if exists public.create_manual_lesson(
  date, time, time, int, public.lesson_type, public.delivery_mode, uuid, text, text, boolean, jsonb
);

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
  p_student_ids uuid[]
)
returns public.lessons
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_student_id uuid;
  v_price numeric(10, 2);
  v_count int;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can create lessons manually';
  end if;

  v_count := coalesce(array_length(p_student_ids, 1), 0);
  if v_count < 1 then
    raise exception 'at least one participant is required';
  end if;
  if v_count > 3 then
    raise exception 'a lesson can have at most 3 participants';
  end if;

  v_price := public.calculate_lesson_price(p_lesson_type, p_duration_minutes);

  insert into public.lessons (
    date, start_time, end_time, duration_minutes, lesson_type, delivery_mode,
    subject_id, topic, online_url, status, source, forced, created_by
  ) values (
    p_date, p_start_time, p_end_time, p_duration_minutes, p_lesson_type, p_delivery_mode,
    p_subject_id, nullif(p_topic, ''), nullif(p_online_url, ''), 'confirmed', 'tutor_manual', p_forced, auth.uid()
  ) returning * into v_lesson;

  foreach v_student_id in array p_student_ids loop
    insert into public.lesson_participants (lesson_id, student_id, price_charged)
    values (v_lesson.id, v_student_id, v_price);
  end loop;

  return v_lesson;
end;
$$;
