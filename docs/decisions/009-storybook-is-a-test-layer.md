# Decision 009: Storybook is a test layer, not a catalog

## Status

Active. Adapted on 2026-09-06 from the reference product's decisions 072 and 024; the starter keeps the rule and drops the product-specific evidence.

## Context

`apps/storybook` is easy to describe as a catalog: a browsable showcase of what
`@fifilo/ui`, `@fifilo/patterns` and the web features render. That description
hides what the app actually does in this repository.

The runner is `@storybook/addon-vitest` with `@vitest/browser-playwright`. Every
story runs in headless Chromium through `bun run storybook:test`, in its own CI
job. Accessibility is scanned by `addon-a11y` against the baseline declared in
`apps/storybook/src/test-utils/a11y.ts`. It is the only layer that runs in a real
browser outside E2E, and the only one that audits accessibility.

Treating it as documentation had a cost in the reference product: the same
component ended up with a jsdom `.test.tsx` and a story with `play()` asserting
the same behavior. Two runners, two files, one fact. While Storybook was filed
under "docs", the duplication did not look like duplication.

The starter is small enough to fix the role before that debt exists. The Auth
feature is the running example: `sign-up-form.stories.tsx` under
`apps/storybook/src/stories/features/auth/` is where the form's focus order,
validation feedback and submit path are asserted.

## Options considered

1. **Keep two component layers**, jsdom tests and stories, and accept double
   coverage as defense in depth. Repeating the *form* of a check is defense;
   repeating the *same assertion* is two owners for one fact.
2. **Pick one layer for every component.** Simple to state and wrong in the
   detail: jsdom has no layout, real focus, portal, pointer capture or
   accessibility tree, and a real browser costs seconds per interaction.
3. **Declare the role and split by environment capability**, so a review can
   cite the criterion instead of arguing it again.

## Decision

Adopt option 3.

### The premise

> `apps/storybook` is not a catalog. It is the component test layer, the only
> one that runs in a real browser outside E2E, and the single source of the
> states a component must survive.

Every story is a test. At minimum it is a render smoke test; with `play` it is
a behavior test. A story without `play` is acceptable when the only claim is
"it renders". It is not acceptable as "documentation" that asserts nothing.

The catalog is a consequence, not the purpose. Stories stay browsable and
ordered by the ladder of Decision 010 because that is cheap, not because the
showcase is the product.

### Which layer tests what

The criterion is what jsdom lacks: layout, real focus, portals, pointer capture
and the accessibility tree.

| The behavior depends on... | Layer | Runner |
| --- | --- | --- |
| Layout, focus, portal, pointer, a11y, or it is a user interaction | story with `play` | `bun run storybook:test` |
| Component logic, derivation, formatting, a render branch with no real DOM | `bun test` | `bun run test` |
| A journey across routes, session and persistence | E2E in `e2e/` | `bun run test:e2e` |

One behavior has one layer. A component with a `.test.tsx` and a story with
`play` asserting the same thing is a review finding. Delete the one in the
wrong layer by the criterion above, not the newer one. Decision 008 fixes one
runner per layer; this decision says which layer a component behavior belongs to.

Concretely: `apps/web/src/features/auth/password-requirements.test.ts` stays in
`bun test` because it derives a checklist from a string. The sign-up form's
error focus stays in a story because focus is a browser fact.

### The whole catalog runs

There is no tag include-list. A story that must not enter the run opts out with
the `!test` tag. The smoke coverage that comes free with every story is the main
return of this layer, and an include-list switches it off silently.

### The accessibility baseline is declared

`A11Y_BASELINE_RULES` in `apps/storybook/src/test-utils/a11y.ts` is the only
place a rule is disabled. The list starts empty. A rule enters with a measured
violation count and an owner, and leaves when the debt is paid. A new story must
not add violations even while `a11y.test: 'todo'` reports without failing.

### CI installs the browser explicitly

The `storybook` job runs `bunx playwright install --with-deps chromium
chromium-headless-shell` before `bun run storybook:test`. It does not use the
`mcr.microsoft.com/playwright` image: that image ships Node, and the command
here is `bun run`.

### A component mounted in a story does not read the route

Under `@storybook/react-vite` there is no automatic router wrapper. A `Link`
outside a router context throws. A shell component receives the anchor ready as
a prop, or the story mounts the minimal tree in
`apps/storybook/src/test-utils/auth-story-router.tsx`. This is not a testing
convenience: it is what keeps the shell free of route knowledge.

## Consequences

- `AGENTS.md` and the engineering guides describe Storybook as a test layer.
  The layer rule above derives from that premise.
- Anything published in `packages/ui` or `packages/patterns` carries a story as
  a test obligation, not as a documentation obligation.
- A story reaching `@libs/api-fetch` gets the browser stub through the alias in
  `apps/storybook/.storybook/main.ts`. Stories never hit a running API.
- The catalog does not disappear. It stops being the reason the app exists.

## Revisit when

- Double coverage appears and does not shrink: the jsdom versus browser rule is
  not being applied and needs a gate instead of text.
- A real consumer of the catalog appears: a product or design person browsing
  it to decide, a designer using it as a deliverable, an external publication.
  Then the showcase has an owner and this decision needs a new cut.
- `@storybook/addon-mcp` leaves preview: the component inventory gains an agent
  consumer, which changes the role of the catalog.
- The runner stops running in a real browser. The premise falls with it.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decisions 008, 010 and 011 in prose: one runner per layer, the ladder that
  orders the catalog, and the controls the stories declare.
- `apps/storybook/vitest.config.ts` and `.github/workflows/ci.yml`, job
  `storybook`.
