# Decision 011: Storybook controls declared in `argTypes`, descriptions stay in JSDoc

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 031; the starter keeps the rule and drops the product-specific evidence.

## Context

The Storybook Controls panel rendered an object editor ("Set object") for
boolean props and a free text field for closed unions, in most stories of the
reference product's pattern package. A "Set object" for a boolean communicates
nothing and suggests the component has no state the panel can drive.

The first hypothesis blamed the docgen: `react-docgen`, the default, supposedly
"does not cross the package boundary" to resolve types re-exported from
`@twincam/ui` or `@twincam/patterns`, and the structural fix would be
`typescript.reactDocgen: 'react-docgen-typescript'` in
`apps/storybook/.storybook/main.ts`, at the cost of a slower build.

Both halves of the hypothesis were measured and are false.

### The default docgen already reaches the packages

Counting components with `__docgenInfo` in the built output, `react-docgen`
documented the large majority of package components, including the neutral
compositions in `packages/patterns`. `react-docgen-typescript` documented a
handful. The package boundary is not the obstacle. Switching destroys docgen
coverage, and with it the descriptions and the rest of the panel.

### Build time is not the trade-off

Consecutive `storybook build` runs on the same machine landed within noise for
both docgens. The decision is not a time trade-off. The alternative simply does
not work.

### The real cause

`react-docgen` emits some props without `tsType`: only `defaultValue` and
`required`, taken from the destructuring in the function signature. The props
interface is never read, and props without a default do not appear at all.
Without `tsType`, Storybook cannot infer a control and falls back to the generic
object editor.

This happens per component, not uniformly. A prop that gets `tsType: { name:
"boolean" }` receives the correct control on its own. That is what made the
defect look random across the catalog.

## Options considered

1. **Switch to `react-docgen-typescript`.** Measured: it fixes nothing and loses
   the docgen coverage the panel already has.
2. **Accept the panel as it is.** The panel lies about the component, and a
   story author has no signal that it does.
3. **Keep the default docgen and declare `control` in `argTypes`** for the props
   the docgen does not type, with the repeated maps centralized.

## Decision

Adopt option 3.

### Keep `react-docgen`

Do not configure `typescript.reactDocgen`. The default is the one that reaches
the packages.

### Declare `control` in `argTypes`

Every boolean prop and every closed union in a story declares its `control` in
`argTypes`. Only the control type. The description stays in the component's
JSDoc, which is the single source. Duplicating it in `argTypes` creates a
second source, which is the one exception the repository's comment rule already
prescribes for design system props.

### Centralize the repeated maps

The shared maps live in `apps/storybook/src/test-utils/story-arg-types.ts`:
`booleanArgType` for booleans and, per closed union, a named map such as
`stateSurfaceKindArgType`. The explanation of the cause lives once there, in
the file's JSDoc, not repeated per story.

### Array props keep the object editor

Props like `options` or `items` stay in the object editor. It is the right
control for that shape and is outside this decision.

## Consequences

- Every new story with a boolean prop or a closed union declares the `control`.
  The cost is one line per prop. The return is a panel that stops lying.
- A story that leaves a boolean or enum prop without a usable control is a
  review finding.
- Nothing changes in production runtime. The defect and the fix belong to the
  catalog.
- The reference product guarded this rule by test in the old
  `@storybook/test-runner` `postVisit` hook. That guard has no equivalent under
  `@storybook/addon-vitest` and is not re-expressed in the starter. Until it is,
  the rule is held by review.

## Revisit when

- A way to assert usable controls per story appears under `addon-vitest`. Then
  the review rule becomes a test again, and this decision records how.
- `react-docgen` starts to emit `tsType` consistently for package components.
  The manual `argTypes` become redundant and should be removed.
- The catalog grows to the point where `react-docgen-typescript` build cost
  stops being noise **and** its coverage is fixed. Reopen the comparison with
  new numbers.
- Prop descriptions become required in the panel. Writing JSDoc on the public
  props of `packages/ui` and `packages/patterns` is the prerequisite, whichever
  docgen is chosen.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decisions 009 and 010 in prose: Storybook as a test layer, and the ladder
  that orders the catalog.
- `apps/storybook/src/test-utils/story-arg-types.ts`, the shared maps.
