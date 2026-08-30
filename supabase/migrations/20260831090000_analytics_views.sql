-- Phase 13 (docs/IMPLEMENTATION_PLAN.md §S): analytics/reporting. Plain
-- views, not materialized - fine at this data scale (15-20 students).
--
-- Rather than one view per breakdown (by subject/student/method), this is
-- a single flattened row-per-participant view; the analytics page filters
-- by date range and groups client-side (same style already used for
-- fetchOverduePayments and the dashboard's today/week/month stats), which
-- avoids four near-identical GROUP BY views to maintain.
--
-- security_invoker = true (not the default "security definer" view
-- behavior) so the view enforces RLS as the *calling* role, not the view
-- owner - a student/parent querying it would only ever see their own rows
-- via the underlying tables' existing RLS, same as querying the tables
-- directly. No new data exposure vs. today.
create view public.v_lesson_income
with (security_invoker = true) as
select
  l.id as lesson_id,
  l.date,
  l.status,
  l.duration_minutes,
  l.subject_id,
  s.name as subject_name,
  lp.student_id,
  st.display_name as student_name,
  lp.price_charged,
  lp.payment_status,
  lp.payment_method,
  lp.payment_received_at
from public.lessons l
join public.lesson_participants lp on lp.lesson_id = l.id
left join public.subjects s on s.id = l.subject_id
left join public.students st on st.id = lp.student_id
-- 'completed' is modeled but never actually set anywhere in the app (a
-- past lesson just stays 'confirmed') - included anyway in case that
-- changes later. 'cancelled' is included because a cancellation fee
-- (price_charged > 0) is still real income, per the cancellation-fee
-- policy - a fully-waived cancellation just nets to 0 either way.
where l.status in ('confirmed', 'completed', 'cancelled');

grant select on public.v_lesson_income to authenticated;

create view public.v_student_activity
with (security_invoker = true) as
select
  st.id as student_id,
  st.display_name,
  st.is_guest,
  st.archived_at,
  st.created_at,
  count(lp.id) as lesson_count,
  min(l.date) as first_lesson_date,
  max(l.date) as last_lesson_date
from public.students st
left join public.lesson_participants lp on lp.student_id = st.id
left join public.lessons l on l.id = lp.lesson_id and l.status in ('confirmed', 'completed', 'cancelled')
group by st.id;

grant select on public.v_student_activity to authenticated;
