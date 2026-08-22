# Tutor Management System

## What this is

A management platform for a private tutoring business.

## Start here

Read these in order:

1. `CLAUDE.md`
2. `PRODUCT_SPEC.md`
3. `DESIGN_GUIDELINES.md`
4. `ai-training/lesson-summaries/`
5. `design-reference/`

## Development rule

Do not implement the entire product in one pass.

Use the approved product spec and build in phases.

Before major changes, explain the plan and identify risks.

## AI training data

Real lesson-summary examples belong in:

`ai-training/lesson-summaries/`

These examples teach writing style and structure.

They are not a source of student facts for other students.

## Running locally

```
npm install
cp .env.local.example .env.local   # fill in Supabase/Anthropic/VAPID keys
npm run dev
```

The implementation plan (tech stack, schema, RLS strategy, phased rollout) lives in
`docs/IMPLEMENTATION_PLAN.md`.

