---
description: Push pending Supabase migrations and regenerate the TypeScript types
---

After writing a new file in `supabase/migrations/`, run this two-step sequence — both steps are required, the types silently drift out of sync if you only do the first:

1. Push the migration (PowerShell, from the project root):
```
$env:Path += ";C:\Program Files\nodejs"; cd "D:\Users\motoe\Desktop\tutor- managment"; npx supabase db push
```
If this is blocked by the permission classifier (destructive-schema-change heuristics, e.g. a `drop column`), prefer rewriting the migration to be additive (add columns instead of dropping/renaming) rather than fighting the block — see CLAUDE.md's note on this from real experience this project.

2. Regenerate types from the project ref in `supabase/.temp/project-ref`:
```
npx supabase gen types typescript --project-id (Get-Content supabase\.temp\project-ref) > src\types\database.ts.new
```
Sanity-check the new file (`grep` for the table/column you just added) before replacing `src/types/database.ts` with it — then delete the `.new` file.

Finish with `/verify` to confirm the regenerated types still type-check against existing code.
