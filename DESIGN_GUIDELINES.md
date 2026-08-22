# DESIGN_GUIDELINES.md — Visual & UX Direction

## Brand personality

The product represents a private tutor who wants to appear:
- professional,
- trustworthy,
- approachable,
- modern,
- organized,
- educational,
- friendly.

Avoid:
- generic corporate SaaS,
- dark/heavy enterprise CRM aesthetics,
- overly childish school software,
- excessive gradients,
- visual noise.

## Approved visual references

See:
- `design-reference/student-dashboard-reference.jpeg`
- `design-reference/tutor-dashboard-reference.jpeg`

These references define the approved visual direction.

They are references, not pixel-perfect instructions.

## Core visual language

### Colors
Primary:
- deep navy blue.

Accent:
- turquoise/cyan.

Secondary semantic accents may include:
- soft green for positive/confirmed,
- purple for selected educational contexts,
- orange/yellow for pending,
- red only for destructive/error states.

Keep colors restrained.

### Surfaces
- white/light surfaces in Light Mode,
- soft neutral background,
- subtle borders,
- very light shadows,
- rounded cards.

Dark Mode should preserve the same hierarchy rather than simply invert every color.

## Typography

Hebrew-first RTL typography.

Prioritize:
- readability,
- clear hierarchy,
- comfortable line height,
- strong headings,
- concise labels.

Avoid overly decorative fonts.

## Layout

Desktop:
- right-side navigation for RTL,
- top bar with identity/notifications/theme,
- main content area,
- cards arranged in a clean grid.

Student dashboard:
- greeting,
- next lesson as primary focal point,
- quick actions,
- homework,
- latest summary,
- upcoming lessons.

Tutor dashboard:
- KPI cards,
- requests,
- payments,
- upcoming lessons,
- calendar,
- operational alerts.

## Components

Prefer reusable components:
- cards,
- stat cards,
- lesson cards,
- status badges,
- buttons,
- modal/dialog,
- calendar,
- student avatar,
- notification item,
- timeline,
- tabs,
- empty states,
- confirmation dialogs.

## Interaction

Every important action should have a clear state:
- loading,
- success,
- error,
- pending,
- disabled,
- confirmed.

Every tappable element also needs an *immediate* press/active state (a quick scale-down + color shift on touch), independent of the states above — without it, a tap gives no feedback at all until a network round-trip or page navigation finishes, which reads as "the button doesn't work" even when it does. `:hover` does not cover this on touch devices, and iOS Safari additionally requires a global touch listener for `:active` to fire at all (see `src/components/ios-active-fix.tsx`) — a plain `active:` Tailwind class alone is not sufficient on iPhone.

When a confirming action follows a warning/conflict state (e.g. "this overlaps — create anyway?"), never show the original action button and the confirm button at the same time — replace one with the other. Two live buttons in that spot is exactly the setup for a mis-click landing on the wrong one after a layout shift.

Avoid ambiguous buttons.

Use Hebrew labels that explain the action.

## Mobile

Design mobile intentionally.

Do not simply shrink the desktop UI.

On mobile:
- prioritize next lesson,
- pending requests,
- quick actions,
- homework,
- summaries,
- notifications.

Use bottom navigation only if it genuinely improves mobile UX; otherwise adapt the desktop navigation.

## Accessibility

- sufficient contrast,
- readable font sizes,
- keyboard accessibility on desktop,
- visible focus states,
- touch targets large enough for mobile,
- semantic HTML,
- RTL support throughout.

## Important product/design distinction

The visual references may contain elements that are no longer part of the approved product.

Example:
- internal student star ratings must NOT be visible to students or parents.

When visual reference and product specification conflict:
PRODUCT_SPEC wins.

## Quality bar

The final UI should feel like a polished real product, not an AI-generated dashboard template.

Consistency matters more than adding decorative elements.
