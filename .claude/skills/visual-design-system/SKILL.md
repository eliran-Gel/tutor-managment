---
name: visual-design-system
description: Use whenever touching colors, fonts, spacing, or component visual style in the tutor-managment app — covers the existing token system, the cn() pitfall, and the hard lesson from the marketing-site redesign about how much visual change the tutor actually wants.
---

# Visual design system (tutor-managment)

## The one lesson that matters most: evolve, don't replace

Early in this project, a full "editorial" visual redesign was proposed for the
*marketing site* (elirangelberg.com), explicitly approved step-by-step by the
tutor, fully implemented, and deployed — then rejected outright the moment he
saw it live: "העיצוב נראה מזעזע!! תחזיר לעיצוב החדש עכשיו!!" (the design looks
awful, revert immediately). The whole thing was reverted with `git checkout
<pre-redesign-commit> -- index.html`, keeping only the non-visual features
built on top (SEO tags, the lead form, GA4, the cancellation-policy fix).

The takeaway isn't "he has bad taste" — it's that **approval of a written
design brief does not reliably predict approval of the shipped result**, and
a from-scratch visual identity swap is expensive to undo emotionally and
technically even when every step was signed off. Default to incremental,
reversible visual changes (better color use, real fonts, spacing, motion —
see [[scroll-animations]]) on top of the *existing* layout and structure,
not a wholesale template replacement. If a request does call for a bigger
visual swing, ship it in the smallest independently-reviewable slice
possible (one page, one section) and get eyes on the live result — not just
a description of it — before continuing to the next slice.

## Token system (app, not the static marketing site)

Tokens live in `src/styles/tokens.css` (raw values, light/dark) and are
projected into Tailwind utilities via `@theme inline` in
[globals.css](../../../src/app/globals.css):

- `--color-background`, `--color-surface`, `--color-surface-muted`, `--color-border`
- `--color-text-primary` / `-secondary` / `-muted`
- `--color-brand-primary`, `--color-brand-accent`, `--color-brand-highlight[-strong]`
- `--color-status-{confirmed,pending,selected,destructive}` (+ `-bg` variants) — semantic state colors, kept separate from the brand accent on purpose (see artifact-design's "semantic color is separate from the accent" principle, which already applies here)
- `--radius-card`, `--radius-control`, `--shadow-card`
- `--font-display` → Suez One (falls back to Rubik) for headings/stat numbers; `--font-sans` → Rubik for body text

**Always reach for an existing token before inventing a new color or radius.**
If a new one is genuinely needed, add it to `tokens.css` for both light and
dark mode, not as a one-off hex literal in a component.

### Why `--font-display` is Suez One, not Outfit

Outfit (the original pick) has no Hebrew glyphs — on Hebrew headings it
silently fell back to the browser default with zero visible styling, and
the only place it ever rendered was on stray digits. Suez One does support
Hebrew. **Before adopting any new display/heading font, confirm it actually
has Hebrew glyphs** — a missing-glyph fallback fails silently, with no error,
so it's easy to ship and not notice.

## The `cn()` pitfall

`src/lib/cn.ts` is a **plain string-join** (`classes.filter(Boolean).join(" ")`),
not `tailwind-merge`. Passing two classes that set the *same* CSS property
(e.g. a component's own `border-...` plus a caller's override `border-...`)
does **not** reliably let the later one win — Tailwind's generated stylesheet
order decides, not className order, which is easy to get backwards.

When a caller needs to override or layer onto a component's own styling,
prefer an independent CSS property on a wrapper instead of fighting the
component's existing classes — e.g. the lesson-files drag-and-drop drop
target uses a `ring-2 ring-brand-accent ring-offset-2` box-shadow ring on an
outer `<div>` around `<Card>`, rather than trying to override `Card`'s own
`border`/`bg` classes.

## RTL + Hebrew

The whole app is Hebrew/RTL. Never hardcode `left`/`right` margins or
`ml-*`/`mr-*` where a logical property or Tailwind's RTL-aware utility
exists; check how existing components in the same directory handle
direction before introducing a new pattern.
