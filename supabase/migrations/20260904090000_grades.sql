-- Grade/progress tracking (business audit checklist item #5). Independent
-- of any specific lesson - a tutor records an exam/quiz score for a
-- student whenever one happens, same shape as `homework` (student_id FK,
-- owns_student/is_parent_of on SELECT), not tied to `lesson_files`/
-- `lesson_id` the way lesson attachments are. Unlike homework's `is_done`,
-- a grade has no field a student/parent should ever be able to write -
-- it's tutor-entered only, so there's no update policy or self-update
-- trigger here at all.

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  subject_id uuid references public.subjects (id),
  title text not null,
  score numeric(5, 2) not null check (score >= 0),
  max_score numeric(5, 2) not null default 100 check (max_score > 0),
  exam_date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index grades_student_idx on public.grades (student_id);
create index grades_exam_date_idx on public.grades (exam_date);

alter table public.grades enable row level security;

create policy "grades_tutor_all"
  on public.grades for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "grades_select_own"
  on public.grades for select
  using (public.owns_student(student_id));

create policy "grades_select_parent"
  on public.grades for select
  using (public.is_parent_of(student_id));
