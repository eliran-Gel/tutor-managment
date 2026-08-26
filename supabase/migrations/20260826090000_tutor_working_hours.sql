-- Default weekly working hours, separate from the ad-hoc one-off/weekly
-- blocking in availability_blocks. Blocking stays for exceptions (a
-- vacation day, an appointment) within an otherwise-open week; this table
-- is the recurring template itself - one row per day of the week
-- (0 = Sunday, matching getDay() as already used in availability.ts).

create table public.tutor_working_hours (
  day_of_week smallint primary key check (day_of_week between 0 and 6),
  is_open boolean not null default false,
  start_time time,
  end_time time,
  constraint tutor_working_hours_open_needs_times check (
    not is_open or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

alter table public.tutor_working_hours enable row level security;

create policy "tutor_working_hours_tutor_all"
  on public.tutor_working_hours for all
  using (public.is_tutor())
  with check (public.is_tutor());

-- Students need to read this directly too, to filter the time picker on
-- their own request/reschedule flows - same shape as
-- availability_blocks_select_authenticated in 20260822101201_availability_blocks.sql.
create policy "tutor_working_hours_select_authenticated"
  on public.tutor_working_hours for select
  using (auth.uid() is not null);

insert into public.tutor_working_hours (day_of_week, is_open, start_time, end_time) values
  (0, true, '17:00', '21:00'),
  (1, true, '17:00', '21:00'),
  (2, true, '17:00', '21:00'),
  (3, true, '17:00', '21:00'),
  (4, true, '17:00', '21:00'),
  (5, true, '09:00', '15:00'),
  (6, false, null, null);
