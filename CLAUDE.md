# CLAUDE.md — Tutor Management System

## Project identity

This project is a web-based management system for Eliran Gelberg's private tutoring business.

The product must feel like a modern educational product, not a generic CRM.

Primary language: Hebrew.
Layout: RTL.
Supported devices: desktop, iPhone, iPad.
Required themes: Light Mode and Dark Mode.

## Source of truth

Use these sources in this order:

1. `PRODUCT_SPEC.md` — product requirements and business rules.
2. `DESIGN_GUIDELINES.md` — visual language and UX principles.
3. `ai-training/lesson-summaries/` — real examples for the AI lesson-summary feature.
4. `design-reference/` — approved visual references.
5. Existing code — implementation reality, but do not let old code override approved product requirements.

If two requirements conflict, do not guess. Identify the conflict and ask.

## Critical product rules

- The tutor/admin has final control over the system.
- Students and parents request; the tutor approves.
- Students cannot directly change confirmed lessons.
- The tutor can create lessons manually, including lessons arranged by phone or WhatsApp.
- The tutor can create forced/manual lessons even when no student request exists.
- The tutor can block unavailable time slots.
- Booking can be requested up to one month ahead.
- Supported lesson durations are 60, 90, or 120 minutes.
- Lessons can only start on the quarter hour (e.g. 16:00, 16:15, 16:30, 16:45), not at arbitrary minutes.
- Group lessons support up to 3 students.
- A group lesson must explicitly list its participating students.
- Pricing is fixed by lesson type and duration, not per-student: individual lessons are ₪140/₪210/₪280 for 60/90/120 minutes; group lessons are ₪110/₪165/₪220 for 60/90/120 minutes.
- The price actually charged is stored on the lesson/payment record at creation/approval time and must not be retroactively changed if the pricing table changes later.
- Two confirmed lessons must never be allowed to overlap in time — this must be enforced both when the tutor approves a request and when the tutor creates a lesson manually, not only one of the two paths.
- The tutor can cancel a lesson that is already confirmed, not only reject a request that is still pending.
- The tutor can permanently delete a student (distinct from archiving, which keeps history but hides them from active views).
- Subjects are a fixed short list (currently מתמטיקה, פיזיקה, מחשבים) seeded by default so the tutor never has to configure them before first use; the tutor can still add more via settings if needed.
- Each student has a grade (כיתה) and school. The grade advances automatically at the start of each school year (September) rather than needing manual yearly updates.
- Payment is tracked manually by the tutor.
- Supported payment methods: cash, Bit, PayBox, other.
- Bit/PayBox are external payment links, not integrated payment processing in the MVP.
- There is no debt-management feature.
- There are no lesson packages.
- Students do not have to register to be managed by the tutor.
- Guest/one-time students must be supported.
- Guest students can later become registered users without losing history.
- Parents can be associated with multiple children and can see all content explicitly published to their children.
- Private tutor notes are never visible to students or parents.
- Internal student ratings/assessments are never visible to students or parents.
- AI-generated lesson summaries are drafts only.
- AI must never invent events, topics, homework, achievements, or facts.
- AI summaries must be reviewed/edited/approved by the tutor before publication.
- The teaching-material library is explicitly out of MVP.
- Online lessons are supported and can contain a lesson link.
- Push notifications are desired.
- WhatsApp integration is planned for later; do not make it a dependency of the MVP.
- Do not build a separate native iOS/Android app in the first version. Build a responsive web app/PWA first.

## Development behavior

Before major implementation:
- Explain the plan.
- Identify dependencies.
- Identify risks and open questions.
- Prefer incremental changes.
- Do not rewrite working code unnecessarily.
- Do not remove approved functionality without explicit approval.
- Keep architecture simple and maintainable.
- Test major functionality.
- Do not silently invent product requirements.

## AI lesson-summary behavior

The tutor will provide a short, rough description of what happened in a lesson.

The AI should produce a draft in the tutor's authentic style based on many real examples.

The AI may:
- organize information,
- improve wording,
- improve Hebrew,
- make the structure clearer,
- match the demonstrated style.

The AI may not:
- invent information,
- claim homework was assigned unless explicitly provided,
- turn suggestions into facts,
- publish automatically.

The tutor remains the editor and final approver.

## UX principles

- Minimize administrative work for the tutor.
- Make common actions fast.
- Prefer clear Hebrew labels over technical jargon.
- Keep important actions visible.
- Make mobile use excellent, not an afterthought.
- Every clickable element must show immediate visual feedback on tap (not just `:hover`, which doesn't exist on touch) — see `src/components/ios-active-fix.tsx` for why this needs a global touch listener, not just `active:` classes, to actually work on iOS Safari.
- Preserve the friendly educational character.
- Avoid visual clutter.
