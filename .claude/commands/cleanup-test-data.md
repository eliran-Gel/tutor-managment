---
description: Audit the live database for orphaned test accounts/students and offer to remove them
---

Audit the live Supabase project for leftover test artifacts and report what you find before deleting anything:

1. List all `students` rows (`id, display_name, profile_id, is_guest`) — flag any with a display_name that looks like a test artifact (contains "TEST", an email address as the name, a timestamp-suffixed string, etc.) or whose `profile_id` no longer resolves to a row in `profiles`.
2. List all `profiles` rows and cross-check against `auth.users` (via `supabase.auth.admin.listUsers()`) for anything that doesn't belong — any profile/student that isn't the real tutor (`moto.eliran@gmail.com`) or real business data the user has referenced in conversation.
3. Report findings, then ask before deleting anything that isn't obviously a throwaway (e.g. don't touch a cancelled-but-real lesson just because it looks unusual).

When deleting, respect FK order: `lessons` (owning any `lesson_participants` for that student) → `students` row → `auth.users` (via admin API), in that order — see the `test-account-hygiene` skill.
