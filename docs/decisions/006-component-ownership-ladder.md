# Decision 006: component ownership, `ui` → `patterns` → `layouts` → `features`, shell versus showcase

## Status

Active. Adapted on 2026-09-06 from the reference product's decisions 018, 029 and 032; the starter keeps the rule and drops the product-specific evidence.

## Context

Web composes pages and integrates router, session and capabilities. The
shared packages offer the reusable visual surface. Without an explicit
boundary, neutral primitives and compositions appear inside `apps/web`, with
parallel implementations, scattered stories and coupling to the first
consumer.

Location cannot be decided by counting consumers. A neutral component is
shareable before its second use. A component with domain vocabulary stays in
its feature even when several pages render it.

Two failure modes drove the split of `patterns` out of `ui`. A dependency used
only by compositions sat in the primitives' manifest, so importing a `Button`
pulled its declaration along. And a shared library ended up installed at two
versions in the graph, one from `packages/ui` and one from the root. Neither
was caught by convention alone.

One more rule was missing: which side of the line a dialog frame or a page
frame belongs to. Features kept re-assembling the same confirmation dialog by
hand and re-declaring the loading, empty and error states that a shared
pattern already owned.

## Options considered

1. **Keep components near the first use and extract after repetition.** Cheap,
   but produces copies and couples neutral code to the first feature.
2. **Put all UI in the shared package, including domain and app shell.** One
   place, but the package absorbs router, session and product vocabulary.
3. **Separate by responsibility and dependency direction**: primitives,
   neutral compositions, app shell and feature UI, each with its owner.

## Decision

Adopt option 3.

### The ladder

```text
@fifilo/ui  →  @fifilo/patterns  →  apps/web/src/layouts  →  apps/web/src/features/<feature>
```

- `packages/ui/src/components` owns domain-neutral visual primitives, kept in
  the copy-and-own model over `@base-ui/react`. Published only by subpath:
  `@fifilo/ui/components/*`, `@fifilo/ui/hooks/*`, `@fifilo/ui/lib/*`.
- `packages/patterns/src` owns reusable compositions with a stable visual or
  interaction contract and no rule, vocabulary or dependency of a feature.
  Published by subpath: `@fifilo/patterns/confirm-dialog`,
  `destructive-dialog`, `dialog`, `password-strength`, `settings`,
  `state-kinds`, `state-surface`.
- A pattern imports from `ui`. A feature imports from `patterns`. Never the
  reverse. A pattern **never** imports `@features/*`, `@fifilo/core` or
  `@tanstack/react-router`. Each package pins this in its own
  `src/package-boundaries.test.ts`.
- `apps/web/src/layouts` owns the global shell coupled to router, session and
  navigation: `app-layout.tsx`, `app-sidebar.tsx`, `nav-user.tsx`,
  `app-auth-layout.tsx`.
- `apps/web/src/components` is restricted to page structures of the Web app
  (`page.tsx`, `password-field.tsx`). It is not a second UI library.
- Components with the language, state or behavior of a capability live in
  `apps/web/src/features/<feature>` (Decision 007).
- Web never creates copies, visual aliases or wrappers that only rename a
  neutral component. A local wrapper must add an app or feature
  responsibility: router, session, authorization, data or a domain
  presentation rule.

### Shell versus showcase

- **Shell belongs to `packages/patterns`.** It is the frame that does not know
  what it carries: position, hierarchy, density, visual states and
  accessibility semantics. It receives content and callbacks. `ConfirmDialog`,
  `DestructiveDialog`, `StateSurface` and the `settings` rows are shells.
- **Showcase belongs to the feature.** It knows what it carries: which fields,
  which copy, which mutation, which permission. A showcase composes shells; it
  never redraws a frame or redeclares state.
- State is not redeclared. The surface state vocabulary is `StateSurfaceKind`
  and `SurfaceGuardState` from `@fifilo/patterns/state-kinds`. A feature
  carries the data of each state (`{ kind: 'ready', data }`), never a parallel
  set of state names.
- A shell moves to `packages/patterns` when it is domain-neutral, without
  waiting for a second consumer. A second consumer is needed to generalize a
  shell's API, not to create it.
- Feature stories document the functional showcase. Loading, empty, error and
  no-permission are demonstrated once, in `Patterns/StateSurface`. The
  exception is when the copy of a state belongs to the feature.

### Catalog and stories

- Every component in `ui` and every pattern has focused tests beside the
  implementation and a story in `apps/storybook/src/stories/ui` or
  `apps/storybook/src/stories/patterns`. Layouts and features have theirs in
  `stories/layouts`, `stories/features` and `stories/pages` (Decision 010).
- A dependency used by one composition only lives in that package's manifest.
- Versions shared by `ui` and `patterns` (`react`, `react-dom`,
  `@base-ui/react`, `lucide-react`, `class-variance-authority`) pass through
  the root `workspaces.catalog`. One owner per version (Decision 001).

### The Tailwind `@source` gotcha

Tailwind v4 scans by file path, not by workspace package. Every consumer that
scans `packages/ui/src` needs the same line for `packages/patterns/src`.
`apps/web/src/styles/global.css` declares both, and Storybook imports that
file in `.storybook/preview.ts`. A missing `@source` fails silently: the class
is dropped from the generated sheet with no typecheck, lint or build error.
Whoever adds the next UI package to the monorepo adds its `@source` line first.

## Consequences

- `packages/ui` is primitives only. `packages/patterns` is the source of truth
  for neutral compositions.
- Web stays responsible for composition, app integration and feature UI.
- Reviews classify a component by responsibility, not by where it was first
  used. A pattern that imports a feature, or a feature that re-assembles a
  dialog frame by hand, is a review finding.
- Two manifests must stay aligned on shared dependencies. The catalog reduces
  that to one line per package.

## Revisit when

- `packages/ui` or `packages/patterns` stops being shared between Web and
  Storybook.
- A shell needs route, session or cache to work. Either the shell absorbed
  policy or the consumer asks the wrong thing.
- Two features need the same content, not the same frame. That is a shared
  domain module, which needs its own decision.
- Imports between distinct pattern families start to appear.
- The monorepo adopts another distribution mechanism for shared UI.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 007 fixes the internal shape of a feature that composes these shells.
- Decision 010 fixes how the Storybook catalog mirrors this ladder.
