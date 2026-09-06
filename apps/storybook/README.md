# Twincam Storybook

`apps/storybook` is not a catalog. It is the component test layer, the only one
that runs in a real browser outside E2E, and the single source of truth for the
states a component must survive. Every story is a test: a render smoke test at
minimum, behavior when it has a `play`. The catalog ordered by the Atomic ladder
is a consequence, not the purpose.

## Run

From the repository root, with Bun 1.3.14 and Node 24.18.0:

```sh
bun run storybook          # http://localhost:6006
bun run storybook:build    # static build
bun run storybook:test     # every story, headless Chromium through Vitest
```

`storybook:test` runs through `@storybook/addon-vitest`, which boots Storybook
itself; there is no manual start step. Install the browser once, from this
directory so the `playwright` version this package pins is the one that
downloads its revision:

```sh
cd apps/storybook && bunx playwright install --with-deps chromium chromium-headless-shell
```

## One behavior, one layer

The criterion is what jsdom does not have. A behavior that depends on layout,
real focus, portals, pointer capture, the accessibility tree, or that is a user
interaction, lives in a story with `play`. Component logic, derivation and
formatting live in `bun test`. A journey across routes, session and persistence
lives in E2E. A component whose `.test.tsx` and story `play` assert the same
thing is a finding: delete the one in the wrong layer.

## Where a story lives

Stories are centralized here and grouped by ownership; production components
stay in their packages and apps.

| Directory | Group | Owner of the component |
| --- | --- | --- |
| `src/stories/ui` | `UI` | `packages/ui` primitives |
| `src/stories/patterns` | `Patterns` | `packages/patterns` compositions |
| `src/stories/features` | `Features` | `apps/web/src/features/<feature>` |
| `src/stories/layouts` | `Layout` | `apps/web/src/layouts` shells, with placeholder content |
| `src/stories/pages` | `Pages` | a route, rendering the real page component |

A `Layout` story never renders a real `Features` component. A `Pages` story is
named after the route, mounts the real page inside the real shell and varies only
by what the route resolves from the URL; submission stays with the feature story.

## Conventions

- A component mounted in a story does not read the route. `Link` outside router
  context throws under `@storybook/react-vite`, so `withAuthRoute` mounts the
  minimal tree and the shell receives what it needs as props.
- `@libs/api-fetch` resolves to `src/api-fetch.ts`, a browser stub, because the
  real module reads the SSR request through TanStack Start.
- Controls for boolean and closed-union props are declared in `argTypes` from
  `src/test-utils/story-arg-types.ts`; descriptions stay in the component JSDoc.
- Accessibility runs on every story with `test: 'todo'` against the baseline in
  `src/test-utils/a11y.ts`. New stories must not add violations.
- Auth form stories mount the `*FormFields` surface over a `useForm` with the
  real schema, so validation messages are production copy. Toast copy comes from
  `apps/web/src/features/auth/feedback.ts`, shared with the hooks; server
  messages are fixtures in `apps/web/src/features/auth/storybook/`.
- Stories are deterministic and never call the live API.
