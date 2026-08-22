-- Phase 6: manual/forced/group lesson creation. See
-- docs/IMPLEMENTATION_PLAN.md sections J and K.
--
-- Creates a confirmed lesson directly (no request/approval step) with 1-3
-- participants in one transaction, mirroring approve_lesson_request's
-- atomicity guarantee. `forced` lets the tutor deliberately override a
-- detected conflict (checked by the caller beforehand, not by this
-- function - see the createManualLesson server action).
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
  p_participants jsonb -- [{"student_id": "uuid", "price": number}, ...]
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
  end loop;

  return v_lesson;
end;
$$;
