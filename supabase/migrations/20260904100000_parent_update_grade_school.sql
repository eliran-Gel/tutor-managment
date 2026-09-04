-- Lets a parent fill in their child's grade/school from the portal, the
-- same way a student can for themselves (students_update_own, see
-- 20260822141500_student_self_update_grade_school.sql) - previously only
-- the tutor or the student themself could touch this row at all, so a
-- parent picking their child in the new portal child-selector had a
-- "כיתה ובית ספר" card with a save button that would silently fail RLS.
-- The existing restrict_student_self_update trigger already locks down
-- which columns any non-tutor may change regardless of which policy
-- matched, so this only needs the missing USING/WITH CHECK clause - no
-- trigger changes.
create policy "students_update_parent"
  on public.students for update
  using (public.is_parent_of(id))
  with check (public.is_parent_of(id));
