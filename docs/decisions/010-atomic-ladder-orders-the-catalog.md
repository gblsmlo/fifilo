# Decision 010: the Atomic Design ladder orders the catalog

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 028; the starter keeps the rule and drops the product-specific evidence.

## Context

`apps/storybook` organizes stories by directory, and each directory becomes a
sidebar group through `titlePrefix` in `apps/storybook/.storybook/main.ts`:
`UI`, `Patterns`, `Features`, `Layout` and `Pages`. The visual order of those
groups is controlled separately, by `storySort.order` in
`apps/storybook/.storybook/preview.ts`.

The group does not come from the `title:` field of a story. `title:` holds only
the leaf; the group comes from the directory. Grepping `title:` measures the
leaf, not the ladder.

Without a rule, group order grows by accretion: each new group lands where it
seemed to fit on the day it appeared. The reference product placed `Layout`
between `Patterns` and `Features` under the informal criterion "shared frames
before the compositions they wrap". That criterion does not survive inspection.
The auth layout does not compose features. It receives `children` as
`ReactNode` and never imports a feature component. There was no verifiable rule
for where `Layout` sits, nor for where a future group would sit.

Atomic Design (Brad Frost) already names the ladder, from most indivisible to
most concrete: atoms → molecules → organisms → templates → pages. A template
arranges organisms into a page skeleton with placeholder content and no real
data. That is exactly what `Layout/Auth` does in
`apps/storybook/src/stories/layouts/auth-layout.stories.tsx`: it renders a
placeholder where the real form would go. That places it after the organisms
on the ladder, not before.

## Options considered

1. **Keep the historical order.** No verifiable criterion; every new group
   reopens the same discussion.
2. **Order by the real import graph.** It does not separate `Layout` from
   `Features`: the auth layout imports neither, so the graph gives no signal.
3. **Adopt the Atomic Design ladder as the reference**, mapping each group of
   this catalog to one of the five levels.

## Decision

Adopt option 3.

### The mapping

| Atomic Design level | Group here | Source package |
| --- | --- | --- |
| Atoms / Molecules | `UI` | `@fifilo/ui` |
| Neutral organisms, no domain vocabulary | `Patterns` | `@fifilo/patterns` |
| Domain organisms | `Features` | `apps/web/src/features/<capability>` |
| Templates: page structure, placeholder content | `Layout` | `apps/web` layouts |
| Pages: the template filled with real content and route state | `Pages` | `apps/web` pages |

Final order in `storySort.order`: `UI, Patterns, Features, Layout, Pages`.

There is no `Overview` group in the starter. If a meta group appears later, it
anchors at one end of the order and does not receive a position by level.

Inside `Pages` the order is the access journey (`Login`, `Register`,
`ForgottenPassword`, `ResetPassword`, `TwoFactor`), not the alphabetical order
Storybook would apply. That is a nested entry in the same `storySort.order`.

An entry in `storySort.order` that matches no real group is ignored by Storybook
in silence. It breaks nothing and survives review. The list must be checked
against existing titles, not against the memory of whoever wrote it.

### A `Layout` story never renders a real `Features` component

Doing so would return the template to the condition of a page. The shell would
stop being the reusable frame any page can compose and would document one
specific composition, which already has its place in `Pages`. The auth layout
story renders a placeholder surface from
`apps/storybook/src/test-utils/auth-story-surface.tsx` for this reason.

### A new group asks which level it belongs to first

Before positioning a new group, ask which rung of the ladder it is. Do not
append to the end of `storySort.order` by default.

### Where the operational detail lives

Which directory holds which group, and what each one documents, lives in
`apps/storybook/README.md`. This decision is the reason for the order, not the
user manual of the catalog. Where a component physically lives is Decision 006;
this decision only orders how stories are presented.

## Consequences

- The position of any group becomes verifiable against a single external
  reference instead of being reconstructed from precedent.
- `.storybook/main.ts` (declaration order of directories) and
  `.storybook/preview.ts` (`storySort.order`, which is what actually controls
  the sidebar) change together. Only the second has a visual effect, but letting
  the two diverge confuses whoever reads the config later.
- A review that finds a `Layout` story importing from
  `apps/web/src/features/` has a citable rule to request the fix.
- The catalog stays a consequence of Decision 009. Ordering it is cheap; that is
  the only reason it is done.

## Revisit when

- A new group fits none of the five levels clearly. The mapping needs a new
  line, not a silent exception.
- Atomic Design stops being the reference for the product's visual structure.
- A `Layout` starts to require a real `Features` component to make sense. That
  is the sign the shell absorbed page-specific logic and needs reclassifying.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decisions 006 and 009 in prose: component ownership, and the role of the
  Storybook app.
- `apps/storybook/README.md`, `apps/storybook/.storybook/main.ts`,
  `apps/storybook/.storybook/preview.ts`.
- Brad Frost, *Atomic Design*: <https://atomicdesign.bradfrost.com/>
