# PRODUCT_SPEC.md — Product Requirements

## 1. Product overview

Build a management platform for a private tutoring business.

The system centralizes:
- students and families,
- scheduling,
- lesson requests,
- manual scheduling,
- individual and group lessons,
- lesson summaries,
- homework,
- payments,
- business analytics,
- student learning notes,
- notifications,
- online lessons,
- parent/student dashboards.

The product is designed for a small tutoring business of approximately 15–20 active students initially, but should be architected so it can grow.

The tutor is the owner and final decision-maker.

---

## 2. Users and roles

### 2.1 Tutor / Admin

Full access.

Can:
- create/edit/archive students,
- manage parents,
- create lessons manually,
- approve/reject lesson requests,
- approve/reject lesson-change requests,
- block calendar availability,
- create individual or group lessons,
- assign lesson prices,
- mark payments as received,
- publish summaries,
- create/edit homework,
- maintain private student notes,
- view internal student assessments,
- view analytics and reports,
- manage notifications,
- configure system settings.

### 2.2 Student

Can:
- view their own upcoming lessons,
- view their own lesson history,
- view published lesson summaries,
- view published homework,
- view content explicitly published to them,
- access online lesson links,
- request a lesson,
- request a change,
- view relevant payment information,
- use contact/home navigation.

Cannot:
- directly alter confirmed lessons,
- see private tutor notes,
- see internal ratings,
- see other students' information,
- approve their own payments,
- publish content.

### 2.3 Parent

A parent can be connected to multiple children.

Can:
- switch between their children,
- view all content explicitly published for each child,
- view their children's lessons,
- view summaries,
- view homework,
- request lessons/changes where permitted.

Cannot:
- see tutor-only notes,
- see internal ratings,
- see other families,
- change confirmed lessons without tutor approval.

### 2.4 Guest / One-time student

A student does not need to register in order for the tutor to manage them.

The tutor can create:
- a one-time student,
- a student who prefers WhatsApp/phone coordination,
- a student who has not joined the platform.

Their lesson history can still exist in the tutor system.

Later, the guest student may be invited to create an account and claim/access their existing history.

---

## 3. Scheduling

### 3.1 Booking horizon

Students can request lessons up to one month ahead.

### 3.2 Approval

A student submits a request.

The lesson is not confirmed until the tutor approves it.

Flow:

Student:
`Choose date/time → choose duration → choose lesson type → submit request`

Tutor:
`Review → Approve / Reject`

Only approval creates a confirmed booking.

### 3.3 Manual lessons

The tutor can create a lesson directly.

This is essential because some lessons are arranged:
- by phone,
- by WhatsApp,
- in person,
- outside the platform.

Manual creation must not require a student request.

### 3.4 Forced/manual booking

The tutor can add a lesson even if:
- the student did not request it,
- the time was not selected by the student.

The tutor is the source of truth.

### 3.5 Availability blocking

The tutor can block:
- a single time slot,
- a range,
- recurring unavailable periods.

Blocked times cannot be requested by students.

### 3.6 Lesson duration

Supported:
- 60 minutes,
- 120 consecutive minutes.

Design the data model so other durations can be added later without rewriting the system.

### 3.7 Individual lesson

One student.

### 3.8 Group lesson

Up to 3 students.

When creating a group lesson, the tutor must select the participating students.

Each participant may have a different price.

The group lesson is one scheduled event with multiple participants.

---

## 4. Lesson types

Support:
- in-person,
- online.

Online lessons can store a URL.

The student/parent sees an "Enter lesson" action when appropriate.

---

## 5. Lesson record

A lesson should conceptually contain:

- id
- date
- start time
- end time
- duration
- lesson type: individual/group
- delivery mode: online/in-person
- subject
- topic/title
- status
- students/participants
- price per participant
- payment status per participant
- online URL
- tutor internal notes
- published summary
- homework
- creation source: student request / tutor manual
- timestamps

Statuses should distinguish:
- requested,
- confirmed,
- rejected,
- cancelled,
- completed,
- change requested.

Do not allow clients to bypass these states.

---

## 6. Student dashboard

The approved visual reference is in `design-reference/student-dashboard-reference.jpeg`.

The dashboard should contain, where relevant:

- greeting,
- next lesson,
- lesson details,
- quick actions,
- upcoming lessons,
- latest lesson summary,
- homework,
- published resources,
- contact,
- home,
- website link,
- community link.

Parents see the same kind of published educational information for each child.

The dashboard must not expose private tutor information.

---

## 7. Tutor dashboard

The approved visual reference is in `design-reference/tutor-dashboard-reference.jpeg`.

The dashboard should prioritize:

### Today
- lesson count,
- teaching hours,
- expected income,
- upcoming lessons.

### Week
- lesson count,
- average lessons/day,
- teaching hours,
- expected/received income.

### Month
- lesson count,
- average lessons/day,
- teaching hours,
- expected/received income.

### Operational panels
- pending lesson requests,
- change requests,
- pending payments,
- today's/upcoming lessons,
- students requiring attention.

### Business analytics
- income,
- income by payment method,
- individual vs group,
- income by subject,
- income by student,
- average lesson income,
- active students,
- new students,
- one-time students,
- cancellations,
- teaching hours.

---

## 8. Payments

No full payment processor in MVP.

The system tracks payment status.

Methods:
- cash,
- Bit,
- PayBox,
- other.

Tutor marks a payment as received.

A student may indicate that they have transferred money, but that does not automatically mark the payment as received.

The tutor confirms.

The system should support:
- standard price,
- actual price charged,
- payment status,
- payment method,
- received date,
- optional internal note.

Do not create:
- debt dashboards,
- family debt balances,
- lesson packages.

Bit and PayBox can be represented by external links configured by the tutor.

---

## 9. Lesson summaries

This is a core product feature.

After a lesson the tutor enters rough notes, for example:

"Today we worked on quadratic functions.
Reviewed vertex and intercepts.
He still struggles with word problems.
Solved matriculation questions.
HW 4,5,7,12."

The system sends the relevant information to AI.

AI creates a draft in the tutor's style.

The tutor sees:

`Original notes`
`AI draft`
`Edit`
`Approve & publish`

Only approved content becomes visible to the student/parent.

The AI should learn from the real examples in:
`ai-training/lesson-summaries/`

The examples are style references, not facts to copy into new summaries.

---

## 10. Homework

Homework can be associated with a lesson.

Fields conceptually include:
- title/task,
- description,
- due date,
- status,
- completion state,
- visibility,
- lesson relation.

AI may later suggest homework, but suggestions must be clearly separated from assigned homework.

Only tutor-approved homework is considered assigned.

---

## 11. Student learning information

Tutor-only information can include:

- learning difficulty,
- areas needing reinforcement,
- confidence,
- homework consistency,
- recurring issues,
- private preparation notes.

The system may later calculate or summarize trends.

This information is never visible to students/parents unless the tutor explicitly creates a separate published item.

---

## 12. Notifications

### Tutor notifications

- new lesson request,
- change request,
- payment reported by student,
- upcoming lesson,
- group request,
- important student attention item.

### Student/parent notifications

- lesson approved,
- lesson rejected,
- change approved/rejected,
- upcoming lesson,
- new summary,
- new homework,
- online lesson link available.

Notification settings should eventually be configurable.

Push is preferred.

---

## 13. Payment reminders

Do not automatically pressure students immediately after a lesson.

Instead:
- track unpaid/completed lessons,
- after a configurable number of days, show a reminder to the tutor,
- tutor chooses whether to send a reminder.

WhatsApp sending can be added later.

---

## 14. WhatsApp

WhatsApp is currently an important communication channel.

The system must support manual entry of lessons arranged outside the system.

A future WhatsApp integration may:
- send confirmations,
- send reminders,
- send summary notifications,
- send payment reminders.

Do not make WhatsApp integration a blocker for MVP.

---

## 15. External links

The platform should have configurable links for:
- tutor's website,
- community,
- contact,
- Bit,
- PayBox,
- online lesson provider where appropriate.

---

## 16. Reports and analytics

Required metrics include:

### Time
- average lessons/day,
- lessons/week,
- lessons/month,
- teaching hours.

### Income
- total income,
- expected income,
- received income,
- income by student,
- income by subject,
- income by lesson type,
- income by payment method.

### Payment method
- cash,
- Bit,
- PayBox,
- other.

### Student operations
- active students,
- new students,
- one-time students,
- students requiring attention,
- homework completion trends.

Do not expose tutor-only analytics to students/parents.

---

## 17. Material library

Explicitly OUT OF MVP.

Do not build a teaching-material library now.

The tutor already has:
- external practice links,
- local folders,
- physical books.

A future system may integrate resources, but it is not a current priority.

---

## 18. Design requirements

The product should be:
- professional,
- bright,
- friendly,
- modern,
- educational,
- slightly youthful,
- not childish,
- not corporate-heavy.

Use:
- deep navy brand color,
- turquoise/cyan accents,
- subtle secondary colors,
- rounded cards,
- soft shadows,
- strong RTL hierarchy,
- generous whitespace.

Support:
- Light Mode,
- Dark Mode.

The design references are not pixel-perfect specifications. Product requirements take precedence.

---

## 19. Responsive requirements

Desktop:
- sidebar navigation,
- dense but readable dashboard.

Tablet/iPad:
- adaptive layout,
- comfortable touch targets.

Mobile/iPhone:
- responsive cards,
- touch-friendly controls,
- clear hierarchy,
- no horizontal scrolling for normal workflows.

---

## 20. Authentication and privacy

Preferred initial authentication:
- phone number + one-time code.

Consider email/Apple/Google only if technically justified.

Authorization must ensure:
- tutor sees everything,
- parent sees only linked children,
- student sees only themselves,
- guests can be managed by tutor without registration.

Private tutor notes and internal assessments must be protected at the database/security layer, not only hidden in the UI.

---

## 21. PWA

First version:
- responsive web app,
- installable PWA,
- browser-based,
- mobile and desktop.

Native App Store/Google Play applications are future work.

---

## 22. Technology direction

Initial preferred direction:
- Next.js
- TypeScript
- Supabase
- PostgreSQL

Claude may recommend alternatives, but must justify them and avoid unnecessary complexity.

---

## 23. MVP boundary

MVP should focus on:

1. authentication/roles,
2. tutor dashboard,
3. student/parent dashboard,
4. student management,
5. calendar,
6. availability blocking,
7. booking requests,
8. manual lesson creation,
9. individual/group lessons,
10. approval workflow,
11. lesson details,
12. lesson summaries,
13. AI summary draft workflow,
14. homework,
15. basic payment tracking,
16. basic analytics,
17. responsive/PWA experience,
18. light/dark mode.

Later:
- WhatsApp automation,
- advanced analytics,
- advanced AI,
- native apps,
- material library,
- recording/transcription.

---

## 24. Success criteria

The MVP succeeds if the tutor can replace most daily manual administration with one system.

A normal workflow should be:

Student requests → tutor approves → lesson appears in calendar → lesson occurs → tutor writes rough notes → AI creates draft → tutor edits/approves → student/parent sees summary + homework → payment is manually marked → dashboard/report updates.
