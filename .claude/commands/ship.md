---
description: Full pipeline for landing a change — verify, commit, push, confirm deploy
---

Run the full "ship it" sequence for whatever's currently changed in the working tree:

1. `/verify` (type-check + lint) — fix anything that fails before continuing.
2. `git status` / `git diff` to review exactly what's staged vs not; stage only the files that belong to this change (never a blanket `git add -A` without checking what it picked up — this project has repeatedly accumulated scratch test scripts that must never be committed).
3. Commit with a Hebrew message in the same style as recent commits (`git log --oneline -5` for tone), explaining *why* not just *what*.
4. `git push`.
5. `/deploy-status` to confirm the resulting Vercel deployment reaches Ready — don't report success until it actually has, since Vercel builds take ~20-40s after the push lands.
6. Report the result to the user in Hebrew per their standing preference (see CLAUDE.md / memory).
