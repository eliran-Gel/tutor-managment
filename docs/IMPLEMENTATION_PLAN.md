# Tutor Management System — Implementation Plan

## Context

This is a greenfield project. The `tutor- managment` folder currently contains only planning documents (`CLAUDE.md`, `PRODUCT_SPEC.md`, `DESIGN_GUIDELINES.md`, `README.md`, `design-reference/`, `ai-training/lesson-summaries/`) — no application code, no framework, no dependencies. The goal is to replace the tutor's ad hoc WhatsApp/phone-based administration with a single Hebrew-RTL PWA covering scheduling, approvals, AI-assisted lesson summaries, homework, manual payment tracking, and analytics, with a matching read-scoped dashboard for students and parents.

This plan incorporates the user's final decisions:
1. Materials = simple per-lesson attachments only, no library.
2. Internal ratings/notes must be unreachable by student/parent **at the database layer**, not just hidden in UI.
3. Guest students have full data (lessons, summaries, homework, payments, notes) but zero dashboard access until they register/claim an account; history must survive claiming.
4. Auth = Google OAuth + email/password + email magic link now; phone/OTP added later without a data-model change.
5. Group lessons (max 3) are tutor-created only in MVP; price is a fixed table by lesson type/duration (not manually entered), snapshotted onto the lesson/participant records at booking time — see PRODUCT_SPEC.md §3.9 (superseded the original per-participant-price idea from real usage feedback).
6. Payment reminders: 3-day default, configurable, tutor-facing surfacing only — never auto-sent.
7. Push notifications required; PWA install path must handle the iOS Add-to-Home-Screen requirement explicitly.
8. Students/parents may only request — never directly modify confirmed lessons.
9. Tutor has manual/forced lesson creation and availability blocking that overrides normal request rules.

No code, dependencies, or files are touched until this plan is approved.

---

## A. Recommended technology stack

- **Next.js 14+ (App Router) + TypeScript** — SSR/RSC fits a dashboard-heavy app well, single deployable, good PWA support.
- **Supabase**: Postgres (data), Auth (Google OAuth, email/password, magic link — phone provider addable later with no schema change since it attaches to the same `auth.users` row), Storage (attachments), Realtime (live badge counts/notifications), Edge Functions (AI summary generation, push dispatch — keeps service-role keys server-side only).
- **Row Level Security as the primary authorization boundary**, reinforced by server-side role checks on state-changing Server Actions/Route Handlers (defense in depth).
- **Tailwind CSS** + a small token layer (`styles/tokens.css`) for the navy/turquoise palette and light/dark themes, per `DESIGN_GUIDELINES.md`.
- **shadcn/ui**-style unstyled primitives (Radix under the hood) themed to match the design references — avoids reinventing accessible modal/tabs/dropdown behavior.
- **Zod** for input validation on Server Actions.
- **date-fns-tz** (or Luxon) fixed to `Asia/Jerusalem` for all scheduling logic.
- **web-push** (VAPID) for push notifications, driven from an Edge Function.
- **Anthropic Claude API** for AI lesson-summary drafting, called only from an Edge Function (raw notes may reference other students and must never be sent client-side to a third party directly from the browser).
- Hosting: **Vercel** (simplest Next.js fit); Supabase project on its standard hosted tier.
- No monorepo/turborepo — single app, avoids unnecessary complexity for this scale (15–20 students).

## B. Project folder structure

```
tutor- managment/
  src/
    app/
      (auth)/login/page.tsx
      auth/callback/route.ts
      (tutor)/
        dashboard/
        calendar/
        requests/            # lesson + change requests
        students/[id]/
        summaries/
        homework/
        payments/
        analytics/
        availability/
        settings/
      (portal)/                # shared student + parent shell, role-aware
        dashboard/
        lessons/
        summaries/
        homework/
        materials/
        payments/
        profile/
      layout.tsx / globals.css
    components/
      ui/           # Button, Card, Badge, Modal, Tabs, EmptyState, StatCard...
      dashboard/ calendar/ lessons/ summaries/ homework/ payments/ notifications/
    lib/
      supabase/     # client.ts (browser), server.ts (RSC/server actions), admin.ts (service role, server-only)
      auth/         # role/session helpers, route guards
      dates/        # Asia/Jerusalem helpers
      validation/   # zod schemas
      ai/           # prompt builder, style-corpus loader
    hooks/
    types/          # generated Supabase types + domain types
  supabase/
    migrations/*.sql
    functions/
      generate-lesson-summary/
      send-push-notification/
      notify-on-status-change/
    seed.sql
  public/
    manifest.json  icons/  sw.js
  ai-training/
    lesson-summaries/        # existing source images (kept as-is)
    style-corpus.md          # new: transcribed canonical text examples (see section N)
  design-reference/           # existing
  docs/ (existing PRODUCT_SPEC.md, DESIGN_GUIDELINES.md, CLAUDE.md, README.md stay at repo root)
  .env.local.example
  package.json / tsconfig.json / tailwind.config.ts
```

## C. Database schema

Design principle used throughout: **any tutor-only data lives in its own table with tutor-only RLS**, never as a nullable column on a table students/parents can otherwise read. This is what makes the "protected at the database layer" requirement real rather than a UI convention.

- **profiles** — `id (PK, = auth.users.id)`, `role enum(tutor,parent,student)`, `full_name`, `email`, `phone nullable`, `avatar_url nullable`, `theme_preference`, `created_at`, `updated_at`. Index: `role`.
- **students** (safe fields only) — `id (PK)`, `profile_id (FK→profiles, nullable, unique)`, `is_guest bool`, `claimed_at nullable`, `display_name`, `default_price numeric nullable`, `grade_level nullable`, `archived_at nullable`, `created_at`, `updated_at`. Index: `profile_id`, `is_guest`.
- **student_internal_notes** (tutor-only) — `id (PK)`, `student_id (FK→students, unique)`, `notes text`, `rating smallint nullable`, `updated_by`, `updated_at`. RLS: tutor only, no policy for anyone else.
- **parent_students** — `id`, `parent_profile_id (FK→profiles)`, `student_id (FK→students)`, `created_at`. Unique `(parent_profile_id, student_id)`. Index both FKs.
- **subjects** — `id`, `name unique`, `color nullable`, `active bool`.
- **lessons** — `id`, `date`, `start_time`, `end_time`, `duration_minutes int`, `lesson_type enum(individual,group)`, `delivery_mode enum(online,in_person)`, `subject_id (FK)`, `topic nullable`, `status enum(requested,confirmed,rejected,cancelled,completed,change_requested)`, `online_url nullable`, `source enum(student_request,tutor_manual)`, `forced bool default false`, `created_by (FK→profiles)`, `created_at`, `updated_at`. Index: `(date, start_time)`, `status`, `subject_id`.
- **lesson_tutor_notes** (tutor-only) — `id`, `lesson_id (FK, unique)`, `notes text`, `updated_at`. RLS: tutor only.
- **lesson_participants** — `id`, `lesson_id (FK, on delete cascade)`, `student_id (FK)`, `price_charged numeric`, `payment_status enum(unpaid,paid)`, `payment_method enum(cash,bit,paybox,other) nullable`, `payment_received_at nullable`, `payment_note nullable`, `created_at`. Unique `(lesson_id, student_id)`. Index: `student_id`, `payment_status`. This is the price-snapshot mechanism — price is copied here at booking/approval time and never re-derives from `students.default_price`.
- **change_requests** — `id`, `lesson_id (FK)`, `requested_by (FK→profiles)`, `request_type enum(reschedule,cancel)`, `requested_date nullable`, `requested_start_time nullable`, `requested_end_time nullable`, `reason nullable`, `status enum(pending,approved,rejected)`, `resolved_by nullable`, `resolved_at nullable`, `created_at`. Index: `lesson_id`, `status`.
- **availability_blocks** — `id`, `start_at timestamptz`, `end_at timestamptz`, `recurrence_rule nullable` (MVP: null or simple `weekly`), `note nullable`, `created_at`. Index: `start_at`, `end_at`.
- **lesson_summaries** (publishable, student/parent-visible once published) — `id`, `lesson_id (FK, unique)`, `status enum(pending,ai_drafted,published)`, `final_content nullable`, `published_at nullable`, `created_at`, `updated_at`.
- **lesson_summary_drafts** (tutor-only) — `id`, `lesson_summary_id (FK, unique)`, `raw_notes text`, `ai_draft nullable`, `ai_model_used nullable`, `ai_generated_at nullable`, `updated_at`. RLS: tutor only — this is what prevents a student from ever seeing the raw notes or unedited AI draft, even after publish.
- **homework** — `id`, `lesson_id (FK)`, `student_id (FK)`, `title`, `description nullable`, `due_date nullable`, `status enum(open,done)`, `source enum(tutor,ai_suggested) default tutor` (MVP only ever writes `tutor`; column exists for future extensibility per §N/AB), `created_at`, `updated_at`. Index: `student_id`, `lesson_id`.
- **lesson_attachments** — `id`, `lesson_id (FK)`, `uploaded_by (FK→profiles)`, `file_path` (Supabase Storage key), `file_name`, `file_type`, `file_size_bytes`, `visible_to_students bool default true`, `created_at`. Index: `lesson_id`.
- **notifications** — `id`, `recipient_profile_id (FK)`, `type`, `title`, `body`, `link_path nullable`, `read_at nullable`, `created_at`. Index: `recipient_profile_id, read_at`. Written only by Edge Functions/server code (service role), never directly by clients.
- **push_subscriptions** — `id`, `profile_id (FK)`, `endpoint unique`, `p256dh`, `auth_key`, `user_agent nullable`, `created_at`. Index: `profile_id`.
- **business_links** (public-readable) — single row: `website_url`, `community_url`, `contact_info`, `bit_link`, `paybox_link`, `updated_at`.
- **tutor_settings** (tutor-only) — single row: `payment_reminder_days int default 3`, `default_lesson_duration int default 60`, `updated_at`.

Not in MVP schema (see §Z1): a global materials/tags table, debt/balance tables, lesson-package tables, WhatsApp message log, audit log (flagged as safely postponed in §AB).

## D. RLS / authorization strategy per role

Helper SQL functions: `is_tutor()`, `owns_student(student_id)` (profile↔student match), `is_parent_of(student_id)` (via `parent_students`).

| Table | Tutor | Student | Parent |
|---|---|---|---|
| profiles | all | own row only | own row only |
| students | all | SELECT own row | SELECT linked children |
| student_internal_notes | all | none | none |
| parent_students | all | none | SELECT own links |
| lessons | all | SELECT where participant | SELECT where child is participant |
| lesson_tutor_notes | all | none | none |
| lesson_participants | all | SELECT own rows | SELECT child's rows |
| change_requests | all incl. status UPDATE | INSERT + SELECT own; no UPDATE | INSERT + SELECT child's; no UPDATE |
| availability_blocks | all | SELECT (to avoid requesting blocked slots) | SELECT |
| lesson_summaries | all | SELECT where `status='published'` and own | same, for child |
| lesson_summary_drafts | all | none | none |
| homework | all | SELECT own | SELECT child's |
| lesson_attachments | all | SELECT where `visible_to_students=true` and own lesson | same, for child |
| notifications | all (via service role) | SELECT own | SELECT own |
| push_subscriptions | n/a | own row only (insert/select/delete) | own row only |
| business_links | all | SELECT | SELECT |
| tutor_settings | all | none | none |

Every table defaults to **deny**; policies are additive allow-lists. State-changing actions that affect scheduling integrity (approve request, mark payment, publish summary, force a lesson) are implemented as Server Actions that re-verify `role = tutor` server-side before writing — RLS is the floor, not the only check, since some of these are multi-table transactions RLS alone can't express safely.

## E. Authentication architecture

- Supabase Auth with **Google OAuth** and **email/password + magic link** enabled; phone/OTP explicitly deferred.
- On first sign-in, a `profiles` row is created via a Postgres trigger on `auth.users` insert, with `role` defaulting to `student` unless the sign-up came through a tutor-issued invite link (which pre-assigns `parent` or seeds the single `tutor` row manually/once).
- The tutor account is provisioned once, directly (not via public sign-up) — no public "become a tutor" path exists.
- Because Supabase Auth keys every identity off `auth.users.id` regardless of provider, adding phone/OTP later means enabling the provider and letting a user link/sign in with it — **no change to `profiles`, `students`, or any relationship table** is required. This directly satisfies decision #4.
- Route protection: Next.js middleware checks session + role and redirects to the correct shell (`(tutor)` vs `(portal)`); RLS is the real security boundary, middleware is UX routing only.
- Guest students (`students.profile_id IS NULL`) have no `auth.users` row at all. "Claiming" = tutor sends an invite (email) → student signs up (Google/email) → a server action sets `students.profile_id = new profile id` and `claimed_at = now()` on the matching guest row (matched by tutor selecting which guest record to link, not by auto-matching email, to avoid mismatches) → all existing `lesson_participants`/`homework`/`lesson_summaries` rows keep the same `student_id`, so history is untouched.

## F. Tutor dashboard architecture

Single `(tutor)/dashboard` route composed of independent, independently-loading server components: `KpiRow` (today/week/month via a Postgres view, see §S), `PendingRequestsPanel`, `PendingPaymentsPanel`, `MiniCalendar`, `TodayLessonsList`. Each panel fetches its own slice so one slow query doesn't block the page. Approve/reject/mark-paid actions are Server Actions with optimistic UI updates + toast feedback (loading/success/error states per `DESIGN_GUIDELINES.md`).

## G. Student dashboard architecture

`(portal)/dashboard`, role-aware but no separate codepath from parent view beyond an added child-selector. Layout: greeting → next-lesson focal card (with online join link when applicable) → quick actions → upcoming lessons → latest published summary card → recent lesson attachments → homework list. No mastery/rating widget (removed per decision #2) — that database-level restriction means it's also structurally impossible to render, not just omitted in the JSX.

## H. Parent dashboard architecture

Same `(portal)` shell as students, gated by `role='parent'`. A `ChildSwitcher` component in the sidebar (populated from `parent_students`) sets a `selectedStudentId` in a URL param / cookie; every dashboard query is parameterized by it. All other components are shared with the student view — no duplicate implementation.

## I. Calendar and scheduling architecture

Single calendar component (month/week/day) rendering `lessons` (confirmed/completed) and `availability_blocks`, timezone-fixed to Asia/Jerusalem. Tutor view shows all lessons; student/parent view shows only their own lessons plus blocked ranges (to explain why a slot isn't offered). Booking horizon (≤1 month ahead) enforced both in the request-form date picker and server-side on submission.

## J. Individual and group lesson architecture

One `lessons` row regardless of type; `lesson_type` distinguishes individual/group. `lesson_participants` always drives who's billed and who sees it — even an individual lesson has exactly one row there, keeping downstream code (payments, summaries visibility, homework) uniform instead of branching on lesson_type. Group lesson creation UI (tutor-only in MVP, per decision #5) is a multi-select of up to 3 students with a per-row editable price defaulting to each student's `default_price`.

## K. Manual/forced lesson architecture

Tutor-only creation form skips the request/approval step entirely: `source='tutor_manual'`, `status='confirmed'` directly. A `forced` boolean flags lessons that bypass the normal overlap/availability check (blocked time or clashing with another confirmed lesson) — the UI shows a confirmation dialog ("this overlaps with X, create anyway?") before setting `forced=true`, so it's a deliberate override, not silent.

## L. Availability blocking architecture

Tutor-only CRUD over `availability_blocks`. MVP recurrence is intentionally limited to "none" or "weekly" (a simple day-of-week + time-range repeat) rather than full RRULE — full recurring-exception editing (skip one occurrence, end date changes) is flagged as safely postponed in §AB. Blocked ranges are checked both when rendering available slots to students and server-side on request submission.

## M. Lesson summary + AI architecture

1. Tutor writes rough notes for a specific lesson → stored in `lesson_summary_drafts.raw_notes`, `lesson_summaries.status='pending'`.
2. Tutor triggers "Generate draft" → calls Edge Function `generate-lesson-summary` (server-side, service role) with: the style corpus (§N), the lesson's subject/topic, and the raw notes.
3. Function returns text saved to `lesson_summary_drafts.ai_draft`; `lesson_summaries.status='ai_drafted'`.
4. Tutor UI shows raw notes and AI draft side by side, editable; edits are saved to a working buffer (not yet `final_content`).
5. Only the explicit "אישור ופרסום" (approve & publish) action writes `lesson_summaries.final_content` and sets `status='published'`, `published_at=now()`, and triggers a notification. There is no code path that sets `status='published'` other than this one action.
6. System prompt hard rules (mirroring `CLAUDE.md`): reorganize/reword/improve Hebrew only; never introduce a topic, event, or homework item not present in the raw notes; omit a homework section entirely if none was mentioned (matches the real examples, which don't all have one).

## N. Converting the lesson-summary examples into a style corpus

The 8 files in `ai-training/lesson-summaries/` are images (handwritten notebook photos and a branded template), not text — a text-generation model needs text few-shot examples, not images, for reliable style transfer. Plan:
1. Transcribe each image into clean Markdown, preserving structure (date header, "מה למדנו היום", "דגשים ונקודות חשובות" with sub-bullets, occasional bold/underline for critical rules, optional "שיעורי בית" section only when present in the source).
2. Save as `ai-training/style-corpus.md` — a versioned text file the tutor can review/edit directly (much easier to correct than re-annotating images).
3. Tutor reviews the transcription once for accuracy before it's used in any prompt.
4. The Edge Function loads this file (bundled at deploy time or fetched from Storage) as few-shot context; new approved/published summaries are **not** automatically appended to the corpus in MVP (avoids silent drift in style) — corpus growth is a manual, deliberate action later.

## O. Homework architecture

One row per `(lesson_id, student_id)` in `homework`, always `source='tutor'` in MVP (simplified — AI-suggested homework is explicitly out of MVP per §Z1, even though the column is designed to support it later). Group-lesson homework assignment UI can bulk-create rows for all participants in one action but they remain independent editable rows.

## P. Per-lesson attachment architecture

`lesson_attachments` + Supabase Storage bucket `lesson-files`, path convention `{lesson_id}/{uuid}-{filename}`. Upload via signed URL from a Server Action (validates file type/size, checks tutor role, records the DB row). `visible_to_students` lets the tutor keep something attached but internal (e.g., a marking rubric) — defaults to visible. No tagging, search, or cross-lesson library view in MVP, per decision #1.

## Q. Payment tracking architecture

Lives entirely on `lesson_participants` (no separate payments table, no ledger) — matches the "no debt dashboard" constraint by construction: there's nowhere to compute a running balance from, only per-lesson status. Tutor marks `payment_status='paid'` with method/date/optional note via a Server Action restricted to tutor role.

## R. Payment reminder architecture

No new table. A query (used by the tutor dashboard's "Pending Payments" panel) selects `lesson_participants` joined to `lessons` where `lessons.status='completed'`, `payment_status='unpaid'`, and `lessons.date <= today - tutor_settings.payment_reminder_days`. This only **surfaces** rows to the tutor UI — there is no scheduled job, no outbound message, no automated contact of any kind. `tutor_settings.payment_reminder_days` is editable in Settings (single global value in MVP, not per-student — matches decision #6).

## S. Analytics/reporting architecture

Postgres views (not materialized, at this data scale a view is fast enough): `v_lesson_stats_daily`, `v_lesson_stats_weekly`, `v_lesson_stats_monthly` aggregating count/hours/expected-income/received-income; `v_income_by_subject`, `v_income_by_student`, `v_income_by_method`, `v_student_activity` (active/new/one-time counts). Tutor-only RLS on all views (they read from tutor-only-visible joins anyway via `lesson_tutor_notes`-style protection is not needed here since these are aggregates, but the views themselves get tutor-only grants). KPI cards and the Analytics page both query these views — no duplicate aggregation logic.

## T. Notification architecture

`notifications` table is the single source of truth for in-app notifications (bell icon, unread badge, Realtime subscription for live updates). Written only by server-side code reacting to state changes (approve/reject a request, publish a summary, publish homework, mark payment... per the tutor-facing and student-facing lists in `PRODUCT_SPEC.md` §12). Push delivery is a secondary channel: when a notification is created, the same server code also looks up the recipient's `push_subscriptions` and calls the `send-push-notification` Edge Function (fire-and-forget, failures don't block the in-app notification). `type` is an extensible enum so a future WhatsApp channel can reuse the same trigger points (see §AB future-proofing).

## U. PWA architecture

Standard `manifest.json` (name, icons, `display: standalone`, theme colors matching the navy/turquoise palette) + a service worker for offline-shell caching and push event handling (`next-pwa` or a hand-rolled minimal SW — decide during Phase 0 based on Next.js version compatibility). Push subscription flow: after login, if `Notification.permission` is default, show a non-blocking prompt card explaining push benefits. **iOS handling**: detect iOS Safari not running in standalone mode (`navigator.standalone === false` on iOS) and show an explicit "Add to Home Screen to enable notifications" instructional card instead of the native permission prompt (which won't work / doesn't exist in-browser on iOS) — this is a hard platform constraint (iOS only supports Web Push for installed PWAs, iOS 16.4+), not a bug to work around.

## V. Light/dark theme architecture

CSS custom properties defined once (`styles/tokens.css`) for both themes, following the deep-navy/turquoise language from `DESIGN_GUIDELINES.md` — dark mode preserves hierarchy rather than naive inversion (explicit spec requirement). Theme choice stored in `profiles.theme_preference` (`light`/`dark`/`system`) and applied via a `data-theme` attribute on `<html>`, set both from a cookie (to avoid flash-of-wrong-theme on SSR) and updatable from the header toggle seen in both dashboard references.

## W. Responsive/mobile strategy

Mobile-first component design (not a shrink of desktop), per `DESIGN_GUIDELINES.md` — build the `(portal)` shell mobile-first since students/parents primarily use phones, and the `(tutor)` shell desktop-first since the tutor primarily manages from a desktop but must remain fully usable on iPad/iPhone. Shared `ui/` primitives enforce touch-target sizing and no-horizontal-scroll by default; the tutor sidebar collapses to the header's hamburger/bottom pattern only if testing shows it's genuinely better than an adapted desktop nav (per the guideline's explicit "don't default to bottom nav" instruction).

## X. Security considerations

- RLS as described in §D is mandatory on every table before any client code ships against it — no table goes live with RLS disabled "temporarily."
- Service-role key used only inside Edge Functions / server-only modules (`lib/supabase/admin.ts`), never bundled to the client.
- Server Actions for tutor-only mutations re-check role even though RLS would also block it — protects against RLS policy bugs and gives clean error messages.
- Raw lesson notes (which may reference other students, e.g. comparisons) never leave the server boundary — the AI Edge Function call happens server-side only.
- File uploads validated for type/size server-side before generating a signed URL; Storage bucket policies mirror the `lesson_attachments` RLS logic (no public bucket).
- Guest-student claiming is tutor-initiated and explicit (not auto-matched by email) to prevent account-takeover via a guessed/leaked email address.
- Rate-limit the AI-draft-generation action (per-tutor, generous but non-zero limit) to avoid runaway API cost from accidental repeated clicks.

## Y. Backup/data recovery considerations

- Supabase's built-in daily Postgres backups (point-in-time recovery on paid tiers) are the primary safety net — confirm which tier is in use during Phase 0 and enable PITR if available given this is a real business's operational data.
- Storage bucket versioning is not natively automatic in Supabase Storage; MVP does not implement soft-delete for attachments — deleting a file is permanent (documented, not hidden).
- Consider a lightweight nightly `pg_dump` export to a separate storage location as a second line of defense once the system is handling real payment/schedule data — flagged as a Phase-late task, not required before initial launch with low data volume.
- No destructive admin action (archiving a student, deleting a lesson) performs a hard delete in MVP — archival uses `archived_at`/status fields, not row deletion, so recovery is a matter of un-archiving rather than restoring from backup.

## Z. Deployment architecture

- Vercel project connected to the repo's `main` branch for production; preview deployments per PR/branch for review before merge.
- Supabase project (single environment initially — given the small scale, a separate staging Supabase project is worth adding once real student data exists, so schema migrations can be tested against a copy first; flagged as safely postponed until Phase migrations get non-trivial).
- Migrations applied via the Supabase CLI (`supabase db push` or migration files run in CI) — never hand-edited directly in the dashboard, so `supabase/migrations/` stays the source of truth.
- Edge Functions deployed via Supabase CLI alongside migrations.

## AA. Environment variables and secrets

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-safe.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used in `lib/supabase/admin.ts` and Edge Functions, never `NEXT_PUBLIC_`-prefixed.
- `ANTHROPIC_API_KEY` — Edge Function only.
- `VAPID_PUBLIC_KEY` (client-safe, for push subscription), `VAPID_PRIVATE_KEY` (server-only).
- `GOOGLE_OAUTH_CLIENT_ID` / secret — configured in Supabase Auth provider settings, not app env vars directly.
- All secrets in Vercel/Supabase project settings, never committed; `.env.local.example` documents names only, no values.

## AB. Development phases

Each phase ships something the tutor can actually click through and verify before the next begins.

---

### Phase 0 — Foundations
- **Objective**: Working, deployed skeleton with design tokens and empty auth-gated shells.
- **Features**: Next.js app scaffold, Tailwind + theme tokens (light/dark), Supabase project connected, base layout with RTL, empty `(tutor)` and `(portal)` route groups, CI/deploy to Vercel.
- **DB changes**: `profiles` table + auth trigger only.
- **UI changes**: Login page, empty dashboard shells, theme toggle working.
- **Security**: RLS enabled on `profiles` from day one.
- **Tests**: Manual click-through login→dashboard on desktop + iPhone + iPad viewport; theme toggle persists.
- **Acceptance criteria**: Tutor can log in with Google, lands on an (empty) tutor dashboard shell; toggling dark mode changes the whole app consistently.
- **Dependencies**: none.

### Phase 1 — Auth & roles
- **Objective**: All three roles can sign in and are routed correctly; role is enforced, not just assumed.
- **Features**: Google OAuth, email/password, magic link; tutor seed account; parent/student invite-based sign-up.
- **DB changes**: none beyond Phase 0 (role already on `profiles`).
- **UI changes**: Role-aware redirect middleware; basic profile page.
- **Security**: RLS policy tests — a student session cannot read another student's `profiles` row.
- **Tests**: Automated RLS test (attempt cross-role reads, expect denial); manual sign-up flow for each provider.
- **Acceptance criteria**: Three distinct test accounts (tutor/student/parent) each land in the correct shell and cannot query each other's profile data via the browser client.
- **Dependencies**: Phase 0.

### Phase 2 — Student management
- **Objective**: Tutor can manage the full student roster, including guests and private notes.
- **Features**: Create/edit/archive student (registered or guest), parent linking, internal notes/rating editor.
- **DB changes**: `students`, `student_internal_notes`, `parent_students`, `subjects`.
- **UI changes**: `(tutor)/students` list + detail page with a clearly separated "internal notes" section.
- **Security**: Verify via direct API/RLS test that a student/parent session gets zero rows from `student_internal_notes` even when given a valid `student_id`.
- **Tests**: RLS test for internal notes; CRUD flow test; guest-creation flow with no email required.
- **Acceptance criteria**: Tutor creates a guest student with no account, adds a private rating, and a logged-in student/parent test account confirms it cannot fetch that rating under any query.
- **Dependencies**: Phase 1.

### Phase 3 — Business settings
- **Objective**: Tutor-configurable links and operational settings exist before they're needed by later features.
- **Features**: Settings page for `business_links` and `tutor_settings` (incl. `payment_reminder_days`).
- **DB changes**: `business_links`, `tutor_settings`.
- **UI changes**: `(tutor)/settings` form.
- **Security**: Tutor-only write; public read on `business_links` only.
- **Tests**: Non-tutor session cannot write; student/parent view surfaces the public links (contact/website/community) somewhere reachable.
- **Acceptance criteria**: Changing the payment-reminder threshold in Settings is reflected later in Phase 9's query.
- **Dependencies**: Phase 1.

### Phase 4 — Calendar & availability blocking
- **Objective**: Tutor can see and block time; students can see what's unavailable.
- **Features**: Calendar view (month/week), block/unblock time (single + simple weekly recurrence).
- **DB changes**: `availability_blocks`.
- **UI changes**: `(tutor)/calendar` and `(tutor)/availability`; read-only block indicators surfaced later in the request flow (Phase 5).
- **Security**: Tutor-only writes; blocks readable by all authenticated roles.
- **Tests**: Blocking a slot prevents it from later being selectable in Phase 5's request form.
- **Acceptance criteria**: Tutor blocks a recurring Friday afternoon; the calendar visually reflects it.
- **Dependencies**: Phase 1.

### Phase 5 — Booking requests & approval (individual lessons)
- **Objective**: The core request → approve loop works end-to-end for individual lessons.
- **Features**: Student requests a lesson (subject, date/time within 1-month horizon, duration 60/120), tutor approve/reject.
- **DB changes**: `lessons`, `lesson_participants`, `lesson_tutor_notes`.
- **UI changes**: `(portal)` request form; `(tutor)/requests` panel with approve/reject.
- **Security**: Student can INSERT a request only for themselves; only tutor can transition `status`.
- **Tests**: Booking horizon boundary (exactly 1 month), blocked-slot rejection, price-snapshot correctness on approval, RLS test that a student cannot set `status='confirmed'` directly via the client.
- **Acceptance criteria**: A student request appears in the tutor's pending panel; approving it creates a confirmed lesson visible on the student's dashboard with the correct price recorded even if the student's default price is changed afterward.
- **Dependencies**: Phases 2, 3, 4.

### Phase 6 — Manual, forced, and group lessons
- **Objective**: Tutor's full manual-control toolkit (§K/§J) is available.
- **Features**: Tutor creates a lesson directly (no request), force-create over a conflict/block with confirmation, create a group lesson (≤3 students, per-participant price).
- **DB changes**: none beyond Phase 5 (`lesson_type`, `forced`, `source` already modeled).
- **UI changes**: "New lesson" tutor form with individual/group toggle and manual/forced options.
- **Security**: Tutor-only route; forced-lesson creation logged (at minimum via `created_by`/`forced` fields already present) for later review.
- **Tests**: Group lesson with 3 distinct prices produces 3 correct `lesson_participants` rows; forced lesson succeeds despite an overlapping block and shows the confirmation dialog.
- **Acceptance criteria**: Tutor books a WhatsApp-arranged group lesson for 3 students at 3 different prices in under a minute; it appears correctly on all 3 students' dashboards.
- **Dependencies**: Phase 5.

### Phase 7 — Change requests
- **Objective**: Students/parents can ask for a reschedule/cancel without ever mutating a confirmed lesson directly.
- **Features**: Request reschedule/cancel on a confirmed lesson; tutor approve/reject.
- **DB changes**: `change_requests`.
- **UI changes**: Action on a lesson detail card (portal) → tutor's change-requests panel.
- **Security**: RLS test — a student cannot UPDATE `lessons.status` directly under any circumstance, only INSERT into `change_requests`.
- **Tests**: Approving a cancel-type change request correctly updates the underlying lesson's status; rejecting leaves it untouched.
- **Acceptance criteria**: A student requests a reschedule; the original lesson stays confirmed and unchanged until the tutor acts.
- **Dependencies**: Phase 5.

### Phase 8 — Lesson summaries + AI
- **Objective**: The full rough-notes → AI draft → tutor edit → publish pipeline works, with the style corpus in place.
- **Features**: Style-corpus transcription (§N) reviewed by tutor; raw-notes entry; AI draft generation via Edge Function; side-by-side review/edit UI; publish action.
- **DB changes**: `lesson_summaries`, `lesson_summary_drafts`.
- **UI changes**: `(tutor)/summaries` write/review flow; `(portal)/summaries` published list + detail.
- **Security**: RLS test — student/parent session can never read `lesson_summary_drafts` (raw notes or unedited AI draft), even for their own lesson, published or not.
- **Tests**: A summary with no homework mentioned produces no fabricated homework section; a manually-edited draft's edits (not the raw AI output) are what gets published.
- **Acceptance criteria**: Tutor types 3 rough sentences about a real lesson, generates a draft matching the tone of the corpus examples, edits one line, publishes, and the student sees exactly the edited final version — never the raw notes.
- **Dependencies**: Phase 5 or 6 (needs a lesson to summarize).

### Phase 9 — Homework
- **Objective**: Tutor can assign homework tied to a lesson; students/parents see only assigned (not suggested/draft) homework.
- **Features**: Create/edit homework per student (bulk-create across group participants), mark done.
- **DB changes**: `homework`.
- **UI changes**: `(tutor)/homework` and lesson-detail homework editor; `(portal)/homework` list.
- **Security**: `source` always `tutor` in MVP; RLS scoped like other participant-owned data.
- **Tests**: Group-lesson bulk assignment creates independent per-student rows; marking done for one student doesn't affect siblings' rows.
- **Acceptance criteria**: Homework assigned after a group lesson shows correctly and independently on each of the 3 students' dashboards.
- **Dependencies**: Phase 6 (needs lessons, including group).

### Phase 10 — Attachments
- **Objective**: Tutor can attach files to a specific lesson; students see only what's marked visible.
- **Features**: Upload (PDF/image/pptx/etc.) to a lesson, toggle visibility, download.
- **DB changes**: `lesson_attachments`; Storage bucket + policies.
- **UI changes**: Attachment section on lesson detail (tutor + portal).
- **Security**: Signed-URL upload flow validated server-side (type/size); Storage bucket policy mirrors table RLS.
- **Tests**: A file marked `visible_to_students=false` is not fetchable by a student session even with a guessed path.
- **Acceptance criteria**: Tutor attaches a PDF to a lesson; the relevant student sees and can open it from their dashboard; an unrelated student cannot.
- **Dependencies**: Phase 5 or 6.

### Phase 11 — Payments & reminders
- **Objective**: Manual payment tracking and reminder surfacing work per §Q/§R.
- **Features**: Mark payment received (method/date/note); Pending Payments panel using the reminder-threshold query.
- **DB changes**: none beyond `lesson_participants` (already modeled in Phase 5).
- **UI changes**: `(tutor)/payments`; portal payment-status display (no "your balance" aggregate, per no-debt-dashboard rule).
- **Security**: Only tutor can write payment fields.
- **Tests**: Changing `tutor_settings.payment_reminder_days` (Phase 3) changes which lessons appear as overdue; a student's own "I paid" note (if implemented as a comment/flag) never flips `payment_status` itself.
- **Acceptance criteria**: An unpaid completed lesson older than the configured threshold appears in the tutor's Pending Payments panel and nowhere does the system auto-message anyone about it.
- **Dependencies**: Phase 5, Phase 3.

### Phase 12 — Notifications & push/PWA
- **Objective**: In-app notifications work for all the trigger points in `PRODUCT_SPEC.md` §12, and push works on supported devices with correct iOS handling.
- **Features**: `notifications` table + Realtime bell; push subscription flow; iOS Add-to-Home-Screen instructional path; PWA manifest/install.
- **DB changes**: `notifications`, `push_subscriptions`.
- **UI changes**: Notification bell/dropdown, install prompt, iOS instruction card.
- **Security**: `notifications` never client-writable; push payloads contain no sensitive content (title/generic body only, detail loads after tapping through auth).
- **Tests**: Approve a request → recipient gets both an in-app notification and (if subscribed) a push; iOS Safari not-in-standalone-mode shows the instructional card instead of a broken permission prompt.
- **Acceptance criteria**: Installing the PWA on an iPhone (Add to Home Screen) and enabling notifications results in a real push notification on the next status change.
- **Dependencies**: Phases 5–11 (needs real trigger points to notify about).

### Phase 13 — Analytics & reporting
- **Objective**: Tutor dashboard KPIs and the full analytics page are backed by real views.
- **Features**: All views from §S; KPI cards; Analytics page with income breakdowns.
- **DB changes**: SQL views only, no new tables.
- **UI changes**: `(tutor)/analytics`; dashboard KPI row wired to real data (was placeholder since Phase 0).
- **Security**: Views tutor-only.
- **Tests**: Known seeded data produces the expected aggregate numbers (a straightforward "does the math check out" test).
- **Acceptance criteria**: Today/week/month KPI cards and the analytics breakdowns match a hand-calculated total on seeded test data.
- **Dependencies**: Phases 5, 6, 11 (needs real lessons/payments to aggregate).

### Phase 14 — Polish, hardening, launch
- **Objective**: Production-ready pass across everything already built.
- **Features**: Full responsive pass on real iPhone/iPad hardware (not just devtools), dark-mode consistency audit, empty-state review, RLS full-suite re-test, error/loading-state audit against `DESIGN_GUIDELINES.md`'s interaction rules.
- **DB changes**: none expected; any gaps found get targeted migrations.
- **UI changes**: Fixes only, no new features.
- **Security**: Run the full RLS cross-role test matrix once more end-to-end; confirm no service-role key reaches the client bundle (bundle-scan).
- **Tests**: Full manual walkthrough of the Phase 5–13 acceptance criteria in sequence as one continuous tutor + student + parent session.
- **Acceptance criteria**: The tutor can run one full real week of business through the system without falling back to WhatsApp/manual tracking for anything in MVP scope.
- **Dependencies**: all prior phases.

---

## Explicit call-outs

### 1. What should NOT be built in MVP
Full/searchable material library; WhatsApp automation/integration of any kind; native iOS/Android apps; integrated payment processing (Bit/PayBox stay as external links); debt dashboards/family balances; lesson packages; phone/SMS OTP login; AI-suggested homework; lesson recording/transcription; audit logging beyond basic `created_by`/`forced` fields; staging Supabase environment; automated nightly off-platform backups.

### 2. Decisions that can safely be postponed
Exact SMS/OTP provider choice (Twilio vs. alternatives) — the auth architecture already accommodates adding it later with zero schema change. Full RRULE-based recurring availability (MVP ships single + simple weekly only). A DB-level exclusion constraint to hard-prevent overlapping confirmed lessons (MVP relies on application-layer checks plus the explicit `forced` override; a constraint can be layered in once the override semantics are proven in practice). A dedicated audit-log table. A second (staging) Supabase project. Materialized views for analytics (plain views are fine at 15–20 students' data volume).

### 3. Technically risky parts
**AI hallucination control** — mitigated by strict prompting and a mandatory human-review gate, but no automated guardrail fully eliminates the risk; Phase 8's acceptance test is the main defense. **iOS push reliability** — dependent on users actually completing Add-to-Home-Screen and Apple's Safari push implementation, which has historically been the flakiest part of any cross-platform PWA push story. **Overlap/conflict logic with a `forced` override** — getting the "warn but allow" UX right without either blocking legitimate manual bookings or silently allowing accidental double-bookings needs careful testing (Phase 6). **RLS surface area** — the number of tables with role-specific policies (§D) is large; a single misconfigured policy is a real privacy risk, which is why Phase 1/2/8/10 each include an explicit cross-role RLS test as an acceptance gate, not an afterthought. **Timezone correctness** — all scheduling logic must be tested across a DST transition, not just "it worked once."

### 4. Parts built for future expansion
Auth (§E) already isolates provider choice from the data model. `lessons.duration_minutes` is a plain integer, not an enum, so new durations need no migration. `lessons.source`/`homework.source` enums are extensible (manual/AI-suggested paths can be added without restructuring). `lesson_attachments` is schematically close to a future materials library — adding `tags`/global visibility later is additive, not a rewrite. `notifications.type` plus the single set of server-side trigger points (§T) means a future WhatsApp channel reuses the exact same triggers instead of duplicating notification logic. The tutor-only/public-table RLS split pattern (§C/§D) is the template for any future private data, not a one-off.
