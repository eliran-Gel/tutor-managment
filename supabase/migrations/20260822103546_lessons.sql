-- Phase 5: lessons, lesson_participants, lesson_tutor_notes, and the
-- request -> approve workflow. See docs/IMPLEMENTATION_PLAN.md sections
-- C, D, J, K.

create type public.lesson_status as enum (
  'requested', 'confirmed', 'rejected', 'cancelled', 'completed', 'change_requested'
);
create type public.lesson_type as enum ('individual', 'group');
create type public.delivery_mode as enum ('online', 'in_person');
create type public.lesson_source as enum ('student_request', 'tutor_manual');
create type public.payment_status as enum ('unpaid', 'paid');
create type public.payment_method as enum ('cash', 'bit', 'paybox', 'other');

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes int not null check (duration_minutes > 0),
  lesson_type public.lesson_type not null default 'individual',
  delivery_mode public.delivery_mode not null default 'in_person',
  subject_id uuid references public.subjects (id),
  topic text,
  status public.lesson_status not null default 'requested',
  online_url text,
  source public.lesson_source not null,
  forced boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_valid_time check (end_time > start_time)
);

create index lessons_date_start_idx on public.lessons (date, start_time);
create index lessons_status_idx on public.lessons (status);
create index lessons_subject_idx on public.lessons (subject_id);

alter table public.lessons enable row level security;

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- Tutor-only private notes on a lesson, same pattern as
-- student_internal_notes: a separate table, not a column.
create table public.lesson_tutor_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.lesson_tutor_notes enable row level security;

create trigger lesson_tutor_notes_set_updated_at
  before update on public.lesson_tutor_notes
  for each row execute function public.set_updated_at();

-- The price-snapshot mechanism: price_charged is copied from the
-- student's default_price at approval time and never re-derives from it,
-- so later changes to a student's default price don't rewrite history.
create table public.lesson_participants (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.students (id),
  price_charged numeric(10, 2) not null,
  payment_status public.payment_status not null default 'unpaid',
  payment_method public.payment_method,
  payment_received_at timestamptz,
  payment_note text,
  created_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create index lesson_participants_student_idx on public.lesson_participants (student_id);
create index lesson_participants_payment_status_idx on public.lesson_participants (payment_status);

alter table public.lesson_participants enable row level security;

-- Helper functions (per docs/IMPLEMENTATION_PLAN.md section D) reused by
-- every table where "this row belongs to my own student record" or
-- "...to a child linked to me" needs checking.
create or replace function public.owns_student(target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.students
    where id = target_student_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_parent_of(target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.parent_students
    where student_id = target_student_id and parent_profile_id = auth.uid()
  );
$$;

-- lessons RLS
create policy "lessons_tutor_all"
  on public.lessons for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "lessons_select_own"
  on public.lessons for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.lesson_participants lp
      where lp.lesson_id = lessons.id and public.owns_student(lp.student_id)
    )
  );

create policy "lessons_select_parent"
  on public.lessons for select
  using (
    exists (
      select 1 from public.lesson_participants lp
      where lp.lesson_id = lessons.id and public.is_parent_of(lp.student_id)
    )
  );

-- A student may only ever insert their own pending, non-forced, individual
-- lesson request - never a confirmed/forced/group lesson, and never on
-- someone else's behalf. Only the tutor's policy above permits UPDATE, so
-- no student/parent policy exists for changing status.
create policy "lessons_insert_own_request"
  on public.lessons for insert
  with check (
    created_by = auth.uid()
    and status = 'requested'
    and source = 'student_request'
    and forced = false
    and lesson_type = 'individual'
  );

-- lesson_tutor_notes RLS: tutor-only, no policy for anyone else.
create policy "lesson_tutor_notes_tutor_all"
  on public.lesson_tutor_notes for all
  using (public.is_tutor())
  with check (public.is_tutor());

-- lesson_participants RLS
create policy "lesson_participants_tutor_all"
  on public.lesson_participants for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "lesson_participants_select_own"
  on public.lesson_participants for select
  using (public.owns_student(student_id));

create policy "lesson_participants_select_parent"
  on public.lesson_participants for select
  using (public.is_parent_of(student_id));

-- Approves a pending request atomically: resolves the requesting student
-- from lessons.created_by, snapshots their current default_price into a
-- new lesson_participants row, and flips the lesson to confirmed - all in
-- one transaction (a Postgres function call is implicitly transactional),
-- so there is no window where a participant row exists without a
-- confirmed lesson or vice versa. security invoker: runs under the
-- calling tutor's own already-permissive RLS grants, no privilege
-- escalation needed.
create or replace function public.approve_lesson_request(target_lesson_id uuid)
returns public.lessons
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_student public.students;
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

  if v_student.default_price is null then
    raise exception 'no_default_price:%', v_student.display_name;
  end if;

  insert into public.lesson_participants (lesson_id, student_id, price_charged)
  values (target_lesson_id, v_student.id, v_student.default_price);

  update public.lessons set status = 'confirmed' where id = target_lesson_id
  returning * into v_lesson;

  return v_lesson;
end;
$$;
