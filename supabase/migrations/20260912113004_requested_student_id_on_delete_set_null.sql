-- delete_student() deletes any lesson that already has a lesson_participants
-- row for that student, but a lesson that was requested and then
-- rejected/cancelled *before* approval never got one - it still holds
-- requested_student_id pointing at the student being deleted. Since that
-- column had no ON DELETE clause (defaulting to RESTRICT), deleting such a
-- student failed outright with a foreign-key-violation shown to the tutor.
-- A dead reference on an already-rejected/cancelled request carries no
-- ongoing meaning once the student is gone, so ON DELETE SET NULL is the
-- right behavior - it clears the reference instead of blocking the delete
-- or cascading into deleting the (already-resolved) lesson row itself.
alter table public.lessons
  drop constraint if exists lessons_requested_student_id_fkey,
  add constraint lessons_requested_student_id_fkey
    foreign key (requested_student_id) references public.students (id) on delete set null;
