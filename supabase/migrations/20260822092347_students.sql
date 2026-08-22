-- Phase 2: subjects, students (registered or guest), parent links, and the
-- tutor-only internal notes/rating table. See docs/IMPLEMENTATION_PLAN.md
-- sections C and D.

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "subjects_tutor_all"
  on public.subjects for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "subjects_select_authenticated"
  on public.subjects for select
  using (auth.uid() is not null);

-- Students table holds only "safe" fields — anything readable by the
-- student themself or their parent. Tutor-only data lives in
-- student_internal_notes instead, never as a column here.
create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  is_guest boolean not null default true,
  claimed_at timestamptz,
  display_name text not null,
  default_price numeric(10, 2),
  grade_level text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_profile_id_idx on public.students (profile_id);
create index students_is_guest_idx on public.students (is_guest);

alter table public.students enable row level security;

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

create policy "students_tutor_all"
  on public.students for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "students_select_own"
  on public.students for select
  using (profile_id = auth.uid());

-- Links a parent profile to one or more student rows (a child may have
-- more than one parent, and a parent may have more than one child).
create table public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_profile_id, student_id)
);

create index parent_students_parent_idx on public.parent_students (parent_profile_id);
create index parent_students_student_idx on public.parent_students (student_id);

alter table public.parent_students enable row level security;

create policy "parent_students_tutor_all"
  on public.parent_students for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "parent_students_select_own"
  on public.parent_students for select
  using (parent_profile_id = auth.uid());

-- A parent can see the (safe) row of any child linked to them.
create policy "students_select_parent"
  on public.students for select
  using (
    exists (
      select 1 from public.parent_students ps
      where ps.student_id = students.id
        and ps.parent_profile_id = auth.uid()
    )
  );

-- Tutor-only: private learning notes and internal rating. No policy exists
-- for student/parent roles at all, so RLS denies them by default — this is
-- what keeps this data unreachable "through APIs", not just hidden in the UI.
create table public.student_internal_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  notes text,
  rating smallint check (rating between 1 and 5),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.student_internal_notes enable row level security;

create policy "student_internal_notes_tutor_all"
  on public.student_internal_notes for all
  using (public.is_tutor())
  with check (public.is_tutor());

create trigger student_internal_notes_set_updated_at
  before update on public.student_internal_notes
  for each row execute function public.set_updated_at();
