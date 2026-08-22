-- Seed the tutor's fixed subject list so it never needs manual setup.
insert into public.subjects (name, active)
values ('מתמטיקה', true), ('פיזיקה', true), ('מחשבים', true)
on conflict (name) do nothing;

-- Add a structured grade + reference year alongside the old free-text
-- grade_level (left in place, unused going forward), so the effective
-- grade can be derived automatically each school year (grades advance
-- every September) instead of the tutor manually updating 15-20
-- students' text fields once a year.
alter table public.students
  add column grade smallint check (grade between 1 and 12),
  add column grade_year smallint,
  add column school_name text,
  add constraint students_grade_pair_check
    check ((grade is null) = (grade_year is null));
