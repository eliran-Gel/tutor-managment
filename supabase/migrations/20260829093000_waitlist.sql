-- A student who wants a specific day but finds it fully booked can join a
-- waitlist for that day instead of just giving up. Deliberately confidential
-- per the tutor's explicit request: a student can only ever see/manage
-- their own entry, never the full list or even how many others are on it -
-- only the tutor sees the ordered queue (oldest first = first-come).
create type public.waitlist_status as enum ('waiting', 'fulfilled', 'cancelled');

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id),
  date date not null,
  subject_id uuid references public.subjects (id),
  -- Free-text, not a structured time field on purpose - the tutor asked
  -- for this to carry flexibility notes like "only after 17:00" or
  -- "any time that day", which don't fit a single start_time column.
  note text,
  status public.waitlist_status not null default 'waiting',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index waitlist_entries_created_by_idx on public.waitlist_entries (created_by);
create index waitlist_entries_date_idx on public.waitlist_entries (date);

alter table public.waitlist_entries enable row level security;

create policy "waitlist_entries_tutor_all"
  on public.waitlist_entries for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "waitlist_entries_select_own"
  on public.waitlist_entries for select
  using (created_by = auth.uid());

-- Withdrawing (delete) is the only self-service write - editing in place
-- was intentionally left out of scope; a student can withdraw and submit
-- a fresh entry, mirroring how a lesson request is cancelled+resubmitted
-- rather than edited-via-RLS. Only while still 'waiting', so a student
-- can't delete the historical record of an entry the tutor already
-- fulfilled/declined.
create policy "waitlist_entries_delete_own"
  on public.waitlist_entries for delete
  using (created_by = auth.uid() and status = 'waiting');

-- security definer so the tutor-notification loop can see every tutor
-- profile regardless of the calling student's own RLS visibility - same
-- reasoning as request_lesson.
create or replace function public.join_waitlist(
  p_date date,
  p_subject_id uuid,
  p_note text
)
returns public.waitlist_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.waitlist_entries;
  v_tutor_id uuid;
begin
  insert into public.waitlist_entries (created_by, date, subject_id, note)
  values (auth.uid(), p_date, p_subject_id, nullif(p_note, ''))
  returning * into v_entry;

  for v_tutor_id in select id from public.profiles where role = 'tutor' loop
    perform public.create_notification(
      v_tutor_id, 'waitlist_joined', 'הצטרפות לרשימת המתנה',
      'תלמיד/ה הצטרפ/ה לרשימת ההמתנה לתאריך ' || to_char(v_entry.date, 'DD/MM/YYYY') || '.',
      '/tutor/requests'
    );
  end loop;

  return v_entry;
end;
$$;
