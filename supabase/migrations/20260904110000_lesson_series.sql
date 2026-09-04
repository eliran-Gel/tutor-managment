-- Recurring/weekly lessons (business audit checklist item #5). Lessons
-- still have to be real materialized rows, not a virtually-expanded rule
-- like availability_blocks' `recurrence_rule: 'weekly'` - every calendar
-- page queries `lessons` by date range directly, and each occurrence needs
-- its own row anyway for payment tracking, cancellation, and homework.
-- `lesson_series` is only the template used to generate those rows (from
-- application code, looping week by week and calling the existing
-- create_manual_lesson RPC once per occurrence) - it is never itself
-- shown to students/parents, only to the tutor.
create table public.lesson_series (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes int not null check (duration_minutes > 0),
  lesson_type public.lesson_type not null default 'individual',
  delivery_mode public.delivery_mode not null default 'in_person',
  subject_id uuid references public.subjects (id),
  online_url text,
  topic text,
  student_ids uuid[] not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.lessons add column series_id uuid references public.lesson_series (id) on delete set null;
create index lessons_series_idx on public.lessons (series_id);

alter table public.lesson_series enable row level security;

create policy "lesson_series_tutor_all"
  on public.lesson_series for all
  using (public.is_tutor())
  with check (public.is_tutor());

-- Same function, one new optional parameter appended at the end with a
-- default - every existing call site (without p_series_id) keeps working
-- unchanged; only the new recurring-lesson code path passes it.
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
  p_student_ids uuid[],
  p_series_id uuid default null
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
    subject_id, topic, online_url, status, source, forced, created_by, series_id
  ) values (
    p_date, p_start_time, p_end_time, p_duration_minutes, p_lesson_type, p_delivery_mode,
    p_subject_id, nullif(p_topic, ''), nullif(p_online_url, ''), 'confirmed', 'tutor_manual', p_forced, auth.uid(), p_series_id
  ) returning * into v_lesson;

  foreach v_student_id in array p_student_ids loop
    insert into public.lesson_participants (lesson_id, student_id, price_charged)
    values (v_lesson.id, v_student_id, v_price);
  end loop;

  return v_lesson;
end;
$$;
