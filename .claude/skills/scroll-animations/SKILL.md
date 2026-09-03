---
name: scroll-animations
description: Use whenever adding scroll-triggered reveals, entrance animations, or count-up numbers in the tutor-managment app — covers the framer-motion setup (MotionProvider, Reveal, AnimatedCounter) and the conventions to keep new usages consistent with it.
---

# Scroll & entrance animations (tutor-managment)

This app uses `framer-motion`, wired up once at the root and reused through
two small components — don't reach for a different animation library or
hand-roll a new `IntersectionObserver` here; extend these instead.

## The setup

- **`src/components/motion-provider.tsx`** wraps the whole app in
  `<MotionConfig reducedMotion="user">` from `src/app/layout.tsx`. This makes
  *framer-motion's own* transitions respect the OS-level
  `prefers-reduced-motion` setting automatically — but it does **not** cover
  imperative `animate()` calls (see AnimatedCounter below), which need their
  own explicit check.
- **`src/app/globals.css`** sets `html { scroll-behavior: smooth }` with a
  matching `@media (prefers-reduced-motion: reduce) { scroll-behavior: auto }`
  override — any new global scroll/animation CSS should follow the same
  paired pattern, never one without the other.

## `<Reveal>` — fade + rise on scroll into view

`src/components/reveal.tsx`. Wrap any card/section that should animate in
once as the user scrolls to it:

```tsx
<Reveal delay={0.1}>
  <Card>...</Card>
</Reveal>
```

- `initial={{opacity:0, y:16}}` → `whileInView={{opacity:1, y:0}}`,
  `viewport={{once:true, margin:"0px 0px -60px 0px"}}` — plays once, not on
  every scroll past.
- Stagger a group by giving each sibling an increasing `delay` (0, 0.05,
  0.1, 0.15 — see `tutor/analytics/page.tsx`'s KPI row for the pattern).
- This is a Server-Component-friendly wrapper: the page itself stays a
  Server Component and only `Reveal`'s internals are `"use client"`.

## `<AnimatedCounter>` — counts up once in view

`src/components/animated-counter.tsx`. Takes `value` and a **serializable**
`variant: "integer" | "decimal1" | "currency"` — deliberately not a
formatter function prop, because Server Components cannot pass functions to
Client Components ("Functions cannot be passed directly to Client
Components"). If a new format is needed, add a new variant string and a
case in `formatValue()`, don't add a function prop.

Internally: `useInView` (once) gates an imperative `animate(0, value, {...})`
tween that drives `setDisplay` via `onUpdate`. Because this bypasses
`MotionConfig`'s `reducedMotion="user"` (that setting only governs
framer-motion's own declarative transitions), it does its own
`window.matchMedia("(prefers-reduced-motion: reduce)")` check and jumps
straight to the final value when the user has that preference set. **Any
new imperative `animate()` usage needs this same manual check** — don't
assume `MotionConfig` alone covers it.

## Adding a new animated section

1. Reach for `<Reveal>` first for any "fades in as you scroll to it" need.
2. Only write new framer-motion code directly when neither `Reveal` nor
   `AnimatedCounter` fits (e.g. a drag gesture, a layout animation) — and if
   the imperative `animate()` API is used, replicate the manual
   reduced-motion check from `AnimatedCounter`.
3. Keep it subtle — this is a business/admin tool, not a marketing page;
   entrance fades and count-ups read as polish, but avoid large or playful
   motion that would feel out of place while someone is doing bookkeeping.

## Related: the marketing site's own version of this

elirangelberg.com (the static marketing site, a separate repo/deploy — not
this app) has no build step and can't use framer-motion, so it implements
the same *idea* — fade-and-rise on scroll — as plain vanilla JS directly in
`index.html`. See that repo's `scroll-animations` skill for the
IntersectionObserver-plus-fallback pattern used there; the underlying
principles (respect reduced motion, animate once, progressive enhancement
so nothing is ever stuck invisible) are the same on both sites even though
the implementations differ.
