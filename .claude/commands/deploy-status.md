---
description: Check the latest Vercel deployment status for tutor-managment
---

Check the most recent Vercel deployment for the `tutor-managment` project and report its status in Hebrew (Ready / Building / Error, and how long ago).

Command (PowerShell, from the project root):
```
$env:Path += ";C:\Program Files\nodejs"; cd "D:\Users\motoe\Desktop\tutor- managment"; $env:VERCEL_TOKEN = (Get-Content .env.local | Select-String "VERCEL_TOKEN=(.+)").Matches.Groups[1].Value; npx vercel ls tutor-managment --token=$env:VERCEL_TOKEN --yes
```

If the top entry shows "Building", wait ~30-45s and check again rather than reporting an in-progress build as the final answer — the user wants to know it actually finished, not that it started.

If it shows "Error", fetch the build logs (`npx vercel inspect <deployment-url> --logs --token=$env:VERCEL_TOKEN`) and summarize what broke.
