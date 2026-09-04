-- A lesson the tutor cancels directly (cancel_lesson - always fee-free,
-- per the cancellation-fee policy: "tutor-initiated cancellation: always
-- waived") carries no financial history worth keeping around, unlike a
-- student-initiated cancellation approved via approve_change_request
-- (which can leave a real 0-100% fee on lesson_participants that the
-- tutor may still need to see or collect - that path is deliberately left
-- untouched here, still just marked 'cancelled' as before). The tutor
-- asked not to have to separately clean these up afterward via
-- delete_lesson_from_history every time - this does that step
-- automatically, reusing the exact same "only rejected/cancelled,
-- cascades to participants/homework/files" rule that function already
-- encoded, just inline instead of a second manual action.
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

  update public.lesson_participants
  set price_charged = 0, payment_status = 'paid', cancellation_note = 'השיעור בוטל על ידי המורה - ללא חיוב'
  where lesson_id = v_lesson.id and payment_status = 'unpaid';

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

  perform public.notify_waitlist_of_opening(v_lesson.date, v_lesson.subject_id);

  -- Everyone who needed to know already got their notification above;
  -- the row itself (and its now-zeroed participants) has nothing left
  -- worth keeping. v_lesson is already the full row in memory, so the
  -- delete doesn't lose anything the function still needs to return.
  delete from public.lessons where id = v_lesson.id;

  return v_lesson;
end;
$$;
