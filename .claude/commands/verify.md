---
description: Type-check and lint the whole project, report pass/fail concisely
---

Run these two checks against the tutor-management project and report the result concisely (pass/fail per check, and only the actual errors if any — no need to paste clean output):

1. Type-check: `npx tsc --noEmit` (from the project root; on Windows, prefix with `$env:Path += ";C:\Program Files\nodejs"` in PowerShell if `npx` isn't found).
2. Lint: `npm run lint`.

If either fails, show the specific error(s) and propose a fix — don't just report failure and stop. If both pass, say so in one line; don't narrate the commands you ran.
