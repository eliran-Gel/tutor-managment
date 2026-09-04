-- Closes the gap the waitlist has had since it was introduced: joining one
-- already notifies the tutor (join_waitlist), but nothing ever told the
-- tutor again later when a slot on that exact date actually opened up -
-- the tutor had to remember to check "בקשות ופניות" against every
-- cancellation by hand. This hooks into the two places a *confirmed*
-- lesson actually becomes 'cancelled' (tutor-initiated cancel_lesson, and
-- a student's cancel request being approved via approve_change_request) -
-- a reschedule is deliberately not treated as "freeing a slot" here, since
-- nothing about that flow disappears the way a cancellation does. Matching
-- is by date only, not subject - subject_id on a waitlist entry can be
-- null ("any subject"), and even when set this is only ever advisory
-- information for the tutor to judge, never a hard filter that could
-- silently hide a real opening from them.

create or replace function public.notify_waitlist_of_opening(p_lesson_date date, p_subject_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_name text;
  v_entry record;
  v_tutor_id uuid;
begin
  select name into v_subject_name from public.subjects where id = p_subject_id;

  for v_entry in
    select coalesce(p.full_name, p.email, 'תלמיד/ה') as requester_name
    from public.waitlist_entries we
    join public.profiles p on p.id = we.created_by
    where we.status = 'waiting' and we.date = p_lesson_date
  loop
    for v_tutor_id in select id from public.profiles where role = 'tutor' loop
      perform public.create_notification(
        v_tutor_id, 'waitlist_opening', 'התפנתה משבצת לרשימת המתנה',
        v_entry.requester_name || ' ממתין/ה לתאריך ' || to_char(p_lesson_date, 'DD/MM/YYYY') ||
          coalesce(' (' || v_subject_name || ')', '') || ' - התפנה שיעור בתאריך הזה.',
        '/tutor/requests'
      );
    end loop;
  end loop;
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

    perform public.notify_waitlist_of_opening(v_lesson.date, v_lesson.subject_id);
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

revoke execute on function public.notify_waitlist_of_opening(date, uuid) from public;
revoke execute on function public.notify_waitlist_of_opening(date, uuid) from anon;
revoke execute on function public.notify_waitlist_of_opening(date, uuid) from authenticated;
