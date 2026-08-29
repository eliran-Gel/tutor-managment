-- Real bug report: a tutor-cancelled lesson still showed the student as
-- owing full price in the payments views. There was never any concept of
-- "this cancellation isn't the student's fault" - price_charged just sat
-- there unpaid regardless of why the lesson was cancelled.
--
-- New policy from the tutor: cancelling with plenty of notice (or the
-- tutor cancelling for their own reasons) costs the student nothing.
-- Cancelling late costs a fee based on how much notice was actually given
-- at the moment the cancellation was requested (not whenever the tutor
-- gets around to approving it):
--   - tutor-initiated cancellation (cancel_lesson): always waived
--   - student-initiated cancellation, approved >= 24h before the lesson: waived
--   - approved with 1h-24h notice: 50% of the original price
--   - approved with < 1h notice: 100% of the original price
-- Already-paid participants are left untouched everywhere here - this is
-- about what's still owed, not about issuing refunds.
alter table public.lesson_participants add column cancellation_note text;

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
  v_lesson public.lessons;
  v_lesson_start timestamptz;
  v_hours_notice numeric;
  v_fee_percent numeric;
  v_note text;
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

  select * into v_lesson from public.lessons where id = v_request.lesson_id;

  if v_request.request_type = 'cancel' then
    update public.lessons set status = 'cancelled' where id = v_request.lesson_id;

    -- Notice is measured from when the student actually asked to cancel,
    -- not whenever the tutor happens to approve it - the tutor sitting on
    -- the request for a day shouldn't manufacture a "late cancellation" fee.
    v_lesson_start := (v_lesson.date + v_lesson.start_time) at time zone 'Asia/Jerusalem';
    v_hours_notice := extract(epoch from (v_lesson_start - v_request.created_at)) / 3600;

    if v_hours_notice < 1 then
      v_fee_percent := 1;
      v_note := 'בוטל בהתראה של פחות משעה לפני השיעור - חיוב מלא (100%)';
    elsif v_hours_notice < 24 then
      v_fee_percent := 0.5;
      v_note := 'בוטל בהתראה של פחות מ-24 שעות לפני השיעור - חיוב חלקי (50%)';
    else
      v_fee_percent := 0;
      v_note := 'בוטל בהתראה מספקת - ללא חיוב';
    end if;

    update public.lesson_participants
    set price_charged = round(price_charged * v_fee_percent),
        payment_status = case when v_fee_percent = 0 then 'paid' else payment_status end,
        cancellation_note = v_note
    where lesson_id = v_request.lesson_id and payment_status = 'unpaid';
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
