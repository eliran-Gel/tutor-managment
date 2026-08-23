---
description: Create a throwaway test account (student or tutor role) for live UI verification
argument-hint: [student|tutor]
---

Create one throwaway test account against the live Supabase project to verify a feature end-to-end in the browser preview. Role: $1 (default to `student` if not specified).

Use the service-role key from `.env.local` (never commit it, never print it in full in a way that leaks into a file the user didn't ask for). Node script pattern (adjust role):

```js
const { createClient } = require("@supabase/supabase-js");
// read NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
const supabase = createClient(url, serviceRoleKey);
const email = `test-<short-purpose-tag>+${Date.now()}@example.com`;
const password = "TestPass123!";
const { data } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
// If tutor role is needed:
await supabase.from("profiles").update({ role: "tutor" }).eq("id", data.user.id);
console.log(JSON.stringify({ email, password, id: data.user.id }));
```

Write this to a scratch `.js` file, run it with Node (PowerShell: `$env:Path += ";C:\Program Files\nodejs"` first), then delete the scratch file immediately after running it — never leave throwaway scripts in the repo.

After you're done verifying: **always clean up**, and always in this exact order (see the `test-account-hygiene` skill for why) —
1. Delete any `lessons` rows this account created (cascades to `lesson_participants`).
2. Delete the `students` row where `profile_id` matches this account (the signup trigger auto-creates one for every non-tutor-email signup — deleting the auth user does NOT cascade to it).
3. Only then call `supabase.auth.admin.deleteUser(id)`.

Confirm afterward with a quick `select id, display_name from students` that no orphaned test rows remain in the real roster.
