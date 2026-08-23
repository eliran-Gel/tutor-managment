---
name: test-account-hygiene
description: Use whenever creating or deleting a throwaway Supabase test account (student or tutor) in the tutor-managment project — covers the exact cleanup order needed to avoid leaving orphaned rows in the real students list.
---

# Test account hygiene

This project has exactly one real tutor (`moto.eliran@gmail.com`). Every other signup — including every throwaway test account created for live verification — defaults to `role: "student"` and gets an auto-created `students` row via the `handle_new_user()` trigger (see `supabase/migrations/20260822130017_auto_create_student_on_signup.sql`).

## The bug this skill prevents

`supabase.auth.admin.deleteUser(id)` deletes the `auth.users` row but does **not** cascade to `profiles` or `students` — there is no enforced FK with `ON DELETE CASCADE` between them. Deleting only the auth user leaves an orphaned `students` row behind, permanently, with no error raised.

This happened repeatedly during initial development: a test tutor account named e.g. `test-icons+1787417354669@example.com` stayed visible in the real tutor's students list long after the "cleanup" step ran, because only the auth user was deleted. It surfaced as a real UI bug report (a long orphaned email-as-name broke layout) before the root cause was traced back to this gap.

## Correct cleanup order

1. **Delete any `lessons` this account is tied to** (as `created_by`, or via a `students` row it owns that has `lesson_participants`). Deleting a `lessons` row cascades to its `lesson_participants` rows automatically.
2. **Delete the `students` row** where `profile_id` matches the test account's user id. If this fails with a foreign-key violation from `lesson_participants`, you missed step 1 — go back and delete the owning lesson(s) first.
3. **Only then** call `supabase.auth.admin.deleteUser(id)`.

Skipping straight to step 3 is the mistake to avoid.

## Verifying cleanup actually worked

After cleanup, always re-query and print the result — don't assume success from an absence of errors:

```js
const { data: students } = await supabase.from("students").select("id, display_name");
console.log(JSON.stringify(students));
```

Confirm only real, expected rows remain. An email address or a `___TEST_...___`-style placeholder as a `display_name` is always a leftover, never real data.

## Related

- The `/test-account` and `/cleanup-test-data` slash commands in this project encode this same procedure.
- `src/components/ui/card.tsx` and `src/app/globals.css` (`overflow-wrap: anywhere`) are the defense-in-depth fixes that stop a stray long name from breaking layout even if one slips through — but don't rely on that instead of cleaning up properly.
