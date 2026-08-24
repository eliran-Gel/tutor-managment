-- Cap student display names at 40 characters, enforced at the database
-- layer (not just client-side maxLength) so it holds regardless of entry
-- path - tutor add/edit forms, the quick-guest-student flow on manual
-- lesson creation, and the profiles.full_name -> students.display_name
-- sync trigger.

alter table public.students
  add constraint students_display_name_length check (char_length(display_name) <= 40);
