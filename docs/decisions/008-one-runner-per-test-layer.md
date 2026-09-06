# Decision 008: one runner per test layer

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 027; the starter keeps the rule and drops the product-specific evidence.

## Context

The repository runs three test runners: `bun test` for logic, the Storybook
Vitest addon for rendered appearance, and Playwright for journeys. Three is
the right number only if each one owns a layer nobody else covers. The
reference product measured what happens otherwise.

The measurement that fixed the boundary: a variant function was sabotaged so
an avatar rendered at 80px instead of 24px while the `size-6` class stayed in
the class string. The whole `bun test` suite stayed green. The equivalent
Storybook `play` failed with `expected 80 to be 24`. jsdom only sees the class
string; only a browser resolves the CSS. Roughly a third of the component
tests in that codebase asserted appearance by class string and were blind to
this class of regression.

The migration also found a real defect the green suite hid. A `leading`
variant never reached the DOM because `tailwind-merge` treated it as
conflicting with a `text-*` size class. The test passed because it asserted
the output of the variant function, before the merge.

## Options considered

1. **One runner for everything.** Simplest mental model, but no single runner
   resolves CSS, drives a real route and runs a pure function in three seconds.
2. **Runners by directory.** Easy to enforce, but the same directory holds
   pure logic and rendered appearance, and the wrong runner passes the wrong
   assertion.
3. **One runner per layer, where the layer is what the test asserts.**

## Decision

Adopt option 3.

### The table

| The test asserts | Runner | Why |
| --- | --- | --- |
| **Rendered appearance**: size, spacing, typography, density, focus ring | Storybook `play`, run by `@storybook/addon-vitest` (`bun run storybook:test`) | only the browser resolves CSS; jsdom sees a class string |
| Observable behavior, logic, contract, persistence | `bun test` | no browser needed; runs in seconds without infrastructure |
| Journey with route, session and more than one screen | `@playwright/test` in `e2e/` | one level above the component |

### Rules

1. **The boundary is what the test asserts, not the directory.**
   `packages/ui/src/components/button.test.tsx` under `bun test` may assert
   that a click fires `onClick`. It may not assert that the button is 40px
   tall; that assertion belongs in `apps/storybook/src/stories/ui/components/
   button.stories.tsx` as a `play`.
2. **Two runners covering the same assertion is a review finding.**
3. **Asserting the output of a variant function is not asserting what
   renders.** `cn()` runs `tailwind-merge` after `cva`. Any pair the merge
   treats as conflicting has the same blind spot.
4. **A component test does not depend on the Vite transform.** If a test only
   passes with `import.meta.env`, `?raw`, a CSS import or a TanStack Start
   plugin, either it is at the wrong level or the last revisit trigger fired.
   Decide which before writing a workaround. Path aliases live in
   `tsconfig.base.json` and are mirrored in `apps/web/vite.config.ts` and in
   `storybookAliases` from `apps/storybook/.storybook/main.ts`, which
   `vitest.config.ts` reuses; that duplication is accepted and is the boundary
   being watched.
5. **`play` is runner-agnostic.** It is part of CSF and imports
   `storybook/test`. An appearance assertion written as `play` survives a
   change of Storybook runner, so migrate the assertion first and change the
   runner later, as separate deliveries.

### What stays in `bun test` even when it looks visual

- Pseudo-classes (`hover:`, `focus-visible:`). CSS `:hover` does not respond
  to a synthetic event, so the class is the only available evidence.
- Two tokens with the same value, where computed style cannot tell them apart.
- A removed variant that must not come back; a typed story cannot pass a value
  the type no longer has.
- File content, such as a test that reads `global.css` from disk.

Each such case carries its reason in the test file.

## Consequences

- The repository says out loud that it runs three runners: `bun test`
  (`bun run test`), the Storybook Vitest addon (`bun run storybook:test`) and
  Playwright (`bun run test:e2e`). Each has one job.
- Appearance regressions are caught where they happen, in the browser, and the
  story that documents a component is also the test that guards it
  (Decision 009).
- `bun test` stays fast and free of browser setup. `packages/patterns/src/
  test/dom.ts` injects jsdom for behavior tests only.
- The gate for a fourth runner is review. A new `vitest.config` outside
  `apps/storybook`, or `vitest` arriving as a direct dependency of another
  workspace, requires revisiting this decision first.

## Revisit when

- A story needs to reach the router to render. Then the visual layer and the
  journey layer overlap and the split needs a new line.
- `@storybook/addon-vitest` leaves maintenance or changes its runner contract.
- A component test needs the Vite transform to pass.
- Vitest is proposed for any layer other than Storybook.
- The accessibility baseline in `apps/storybook/src/test-utils/a11y.ts`
  reaches zero disabled rules and the a11y check can move to a stricter mode.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 009 fixes that Storybook is a test layer, not only documentation.
- Decision 010 fixes how the catalog is ordered so each story has one home.
