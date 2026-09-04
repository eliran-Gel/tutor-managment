-- Urgent fix: 20260904110000_lesson_series.sql added p_series_id to
-- create_manual_lesson via `create or replace function`, which - contrary
-- to what its own comment claimed - does NOT replace a function when the
-- parameter list differs (even by only appending one optional/defaulted
-- parameter). Postgres treated it as a second, distinct overload sitting
-- alongside the original 11-parameter one. Every call that omits
-- p_series_id (i.e. every ordinary one-off lesson - the entire normal
-- calendar "create lesson" flow, used far more than the new recurring
-- path) then became genuinely ambiguous to PostgREST, which cannot decide
-- between "the 11-param function" and "the 12-param function using its
-- default" - confirmed live in production via PGRST203
-- ("Could not choose the best candidate function"). This is the exact
-- same class of bug 20260822131847_fixed_pricing.sql already fixed once
-- before (a lingering old-shaped overload) - the fix is identical: drop
-- the old-shaped overload explicitly, don't rely on create or replace to
-- remove it. Only the 12-parameter version (p_series_id defaulting to
-- null) remains, so every existing call site keeps working unchanged.
drop function if exists public.create_manual_lesson(
  date, time, time, int, public.lesson_type, public.delivery_mode, uuid, text, text, boolean, uuid[]
);
