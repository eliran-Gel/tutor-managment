-- Two real-usage gaps found after the notifications feature shipped:
-- 1) a tutor rejecting a request had no way to tell the student why.
-- 2) a student who requested a lesson had no way to withdraw it before
--    the tutor acted on it - only the tutor could approve/reject.

alter table public.lessons add column rejection_reason text;

create or replace function public.reject_lesson_request(target_lesson_id uuid, p_reason text default '')
returns public.lessons
language plpgsql
security invoker
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

-- Mirrors request_lesson's reasoning: the caller is the requesting
-- student/parent, who has no RLS visibility into other profiles, so the
-- tutor-notification loop needs security definer to see every tutor.
create or replace function public.cancel_lesson_request(target_lesson_id uuid)
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_tutor_id uuid;
begin
  update public.lessons set status = 'cancelled'
  where id = target_lesson_id and status = 'requested' and created_by = auth.uid()
  returning * into v_lesson;

  if not found then
    raise exception 'lesson not found, not pending, or not yours';
  end if;

  for v_tutor_id in select id from public.profiles where role = 'tutor' loop
    perform public.create_notification(
      v_tutor_id, 'request_cancelled_by_requester', 'בקשת שיעור בוטלה',
      'בקשת השיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || ' בוטלה על ידי המבקש/ת.',
      '/tutor/requests'
    );
  end loop;

  return v_lesson;
end;
$$;
