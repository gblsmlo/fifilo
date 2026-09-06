# Test plan

Operational plan for how the starter proves behavior: which layer covers which
boundary, how each runner is set up, and what "done" means for a change. The
premises come from the decisions indexed in
[`../decisions/README.md`](../decisions/README.md):

- Different levels (unit, integration, contract, E2E) cover different risks.
  Coverage measures executed code, not the quality of the assertions.
- Integration tests use real controlled components (local PostgreSQL 17). E2E
  walks a few critical journeys through the HTTP interface. There is no rule of
  "one E2E per route".
- Frontend tests observe behavior (role, accessible name), not implementation.
- The repo runs three runners by design (Decision 008): `bun test` for logic and
  jsdom components, `@storybook/addon-vitest` (Vitest in browser mode through
  Playwright) for components in a real browser, and `@playwright/test` for
  journeys. Vitest is not a standalone runner here; it exists only inside the
  Storybook addon.

## 1. Boundaries and their dominant level

| Boundary | Dominant level | Why |
| --- | --- | --- |
| Domain rules (`packages/core`) | Unit | pure, fast, deterministic |
| HTTP contracts (request, response, error) | Unit + integration | schema validation and error mapping |
| Tenant-aware persistence (RLS) | Integration | needs real PostgreSQL, a transaction and context |
| Authorization and actor (session to membership) | Unit + integration | 401/403 and short-circuit |
| Web components and features | Story with `play` when layout, focus, portal, pointer or a11y is involved; `bun test` when it is logic without a real DOM | see § 6.1, one layer per behavior |
| Critical journeys | E2E (Playwright) | few end-to-end flows |

Target distribution is directional, not a hard gate: most tests are unit tests
in Core, one integration layer against real PostgreSQL, and a small E2E set. An
E2E is added only for a risk the layers below cannot prove.

## 2. Unit

### Scope

- Use cases and pure rules in `packages/core` (`Result`, commands, validation).
- Contract schemas in `packages/core/src/contracts/*.test.ts`.
- Pure functions: mappers, derivations, formatting, URL state.
- Elysia routes with injected (mocked) dependencies: status and error mapping
  without touching the database (`apps/api/src/features/auth/auth.routes.test.ts`).

### Hygiene

- Each test creates its own data with unique identifiers. No shared global
  fixture that leaks between tests.
- Assert at the observable boundary: return value, status, body, log.
- Use `expect.assertions(n)` or `expect.hasAssertions()` when the assertion
  lives in a `catch`, a callback or a conditional branch. Otherwise the test
  passes without verifying anything.
- Do not `test.skip` a known bug. Use `test.failing`, which warns when the bug
  is fixed. `test.only` only with `--only`, never to switch the suite off.
- `spyOn` and `mock` are restored in `afterEach` (`mock.restore()`).
  `mock.module()` is never undone by `restore`; register it in a preload when
  the goal is to prevent an import side effect.
- Without `--parallel` all files share one global in the same process. State
  leaked by one file shows up in the next. DOM workspaces use `--isolate`; the
  backend keeps suites per folder with unique data.
- Order dependency between files has no flag that fixes it. Move the setup into
  the file that needs it. Detect with `bun test --randomize`, reproduce with
  `--randomize --seed <n>`, and shake out flakes with `--rerun-each`.

### Runner flags

The backend runs `bun test --env-file ../../.env`. The DOM workspaces
(`apps/web`, `packages/ui`, `packages/patterns`) run:

```sh
bun test --isolate --timeout 20000
```

The per-test budget is larger there because a component in a real DOM costs
seconds per interaction. The 5s default has a 2x margin on a developer machine
and none on the CI runner, which is about 3x slower. A 2.2s test can fail the
pipeline with the whole suite green locally.

### File shapes

```text
packages/core/src/<area>/use-cases/__tests__/<case>.test.ts
apps/api/src/features/<area>/<area>.routes.test.ts      (injected deps)
apps/web/src/features/<area>/utils/*.test.ts            (pure functions)
```

Tests are colocated with the source. `src/test/` holds infrastructure (the
jsdom preload, integration prerequisites) and cross-cutting guards. It is never
a mirror tree of `src/`.

## 3. Integration

### Scope

- Tenant-aware persistence: positive cases, two organizations, `WITH CHECK`,
  no context and rollback (RLS). Tenant-owned business tables do not exist yet;
  the first one must ship with this coverage before its data is exposed.
- HTTP contracts against the real adapter (Drizzle) plus error mapping.
- Session and actor with the real auth handler, outside the DOM.
- Web components with Testing Library (behavior, not implementation).

### Hygiene

- Real local PostgreSQL (container), never a mocked database. It is what proves
  RLS, transactions and concurrency. Doubles for external clients simulate
  success, timeout and failure; they do not replace a smaller contract layer.
- Each test creates its own data with unique ids. Transactional cleanup, an
  isolated schema or an ephemeral database avoids interference under
  parallelism.
- A database test needs the organization context (`current_setting`) and a
  denial without context to be meaningful.
- Frontend: interact as the user does. Find by role or accessible label,
  `userEvent` for flows, `findBy*` for what appears after async work.

### Two classes of integration test

The split is deliberate. Destructive tests (migrate, truncate, create schema)
sit behind `test.skipIf(!destructiveSpikesEnabled)` and only run with
`ALLOW_DESTRUCTIVE_SPIKES`. Non-destructive tests (one user per run, cleanup at
the end) always run. Gating them would hide the class of defect they exist to
catch: a sign-in route that returns a server error.

The price is depending on PostgreSQL on `localhost`. That is why the integration
prerequisite helper `requirePostgres()` fails naming the missing service instead
of letting a connection error masquerade as a regression.

`bun run test` runs both classes and is what CI executes. A `test:unit` script
that excludes `*.integration.test.*` by `--path-ignore-patterns` exists for the
machine without Docker. Scope and size are not the same thing: without the
split, `bun run test` on a machine without services exits `1` for an
environmental reason indistinguishable from a regression.

### Setup

- Run migrations before the suite (`bun run db:migrate`). `drizzle-kit migrate`
  needs an intact history; validate a new migration on a clean database.
- `bun run db:seed` creates a deterministic scenario. Integration tests do not
  depend on the seed for isolation; they create their own data.

### File shapes

```text
apps/api/src/features/<area>/*.integration.test.ts       (RLS, real handler)
apps/api/src/features/<area>/<area>.routes.test.ts       (real adapter)
packages/infra/database/src/**/*.test.ts                 (schema, seed)
apps/web/src/features/<area>/**/<component>.test.tsx     (Testing Library)
```

## 4. E2E (Playwright)

### Scope

Few critical flows, not every rule: authentication as setup, first access and
organization onboarding, and later the journeys of each capability. E2E covers
what unit and integration cannot: real navigation, session cookies, web to API
integration, TanStack routing.

### Rules

- Login is setup (`e2e/auth.setup.ts` writing `storageState`), not repeated in
  every spec. Before saving the state, assert login success on an observable
  state (the dashboard heading). A failed login otherwise records an empty
  state and the whole suite fails pointing at the login screen. `e2e/.auth/`
  is gitignored; it holds a live session credential.
- Unique ids and data per run (`crypto.randomUUID()` suffix on emails and
  slugs). Retries only in CI, never order dependency. A test that depends on
  the first item of a collection is disguised order dependency. Create your own
  record and select it by name.
- Hydration before interaction. The app is SSR: a control exists in the HTML
  before its handlers attach, and a click in that window is lost silently while
  passing every actionability check. The fixture `e2e/helpers/app-test.ts`
  waits for the marker React attaches on hydration after each navigation.
  Import `test` and `expect` from it, not from `@playwright/test`. With the
  gate in place, write direct interaction. Repeating a click "until it works"
  remounts the panel and stops async state from settling.
- `waitForLoadState('networkidle')` is never a valid wait here. The Vite
  websocket keeps the network busy and the call only times out intermittently.
- Web-first assertions on visible behavior: always `await`, never
  `expect(await locator.isVisible())`, which reads one instant instead of
  retrying. Assert the expected positive state instead of only
  `not.toBeVisible()`, which passes with a wrong locator.
- Traces and screenshots only on failure (`trace: 'retain-on-failure'`).

### Tooling

- `bun run test:e2e`, `bun run test:e2e:install` (Chromium), `bun run test:e2e:ui`.
- `webServer` in `playwright.config.ts` starts API and web on ports 3101 and
  3100. `E2E_PORT_OFFSET` shifts both for concurrent runs; `E2E_ENV_FILE` points
  at another `.env`; `E2E_BASE_URL` targets a running deployment.
- Setup runs before specs through `projects` plus `dependencies`.
- The config holds the CI invariants: `forbidOnly: Boolean(CI)` so a forgotten
  `.only` cannot make CI green, `retries` only in CI, trace on failure, and
  `webServer.reuseExistingServer: false` so a job never tests a neighbor's build.

### Structure

```text
e2e/auth.setup.ts
e2e/helpers/app-test.ts
e2e/helpers/auth.ts
e2e/<area>/*.spec.ts
```

## 5. Storybook (visual component)

- Every story is a smoke test. It fails if the component does not render.
- Interaction: `play` with `userEvent`, `expect` always awaited, async waits
  with `findBy*`. Spies are declared in `args` with `fn()`, not inside `play`.
- Run with `bun run storybook:test`. The runner is `@storybook/addon-vitest`
  and starts Storybook itself through `storybookScript`. Playwright binaries
  must be installed (`bun run test:e2e:install`).
- Accessibility is checked by `@storybook/addon-a11y` inside the same run. The
  catalog default is `a11y.test: 'todo'` in `preview.ts`: it reports without
  failing. The baseline lives in `apps/storybook/src/test-utils/a11y.ts` as
  `A11Y_BASELINE_RULES` and starts empty. A rule enters it only with a measured
  violation count and an owner, and leaves when the debt is paid. A new story
  adds no violations. The default scope (`context: 'body'`) audits portal
  content natively.
- A story can harden the gate for itself by passing its own `parameters.a11y`
  with the target rule enabled. The rules array replaces the inherited one, so
  return the whole baseline with the target rule switched on.
- `bun test` never executes stories. The runner needs a real browser.

### 5.1 Which layer tests what

The premise is Decision 009: Storybook is not a catalog, it is the component
test layer, the only one running in a real browser outside E2E.

The cut criterion is what jsdom does not have: layout, real focus, portals,
pointer capture and the accessibility tree.

| The behavior depends on | Layer | Runner |
| --- | --- | --- |
| Layout, focus, portal, pointer, a11y, or it is a user interaction | story with `play` | `bun run storybook:test` |
| Component logic, derivation, formatting, render branch without a real DOM | `bun test` | `bun run test` |
| A journey across routes, session and persistence | E2E | `bun run test:e2e` |

One behavior has one layer. A component with a `.test.tsx` and a story with
`play` asserting the same thing is a finding. Delete the one in the wrong layer
by the criterion above, not the newer one.

## 6. Consolidated tooling

| Need | Tool | Where |
| --- | --- | --- |
| Layer without infrastructure | `bun run test:unit` | all workspaces |
| Layer that consumes PostgreSQL | `bun run test:integration` | `*.integration.test.ts` |
| Backend unit and route tests | `bun test` | `apps/api`, `packages/core` |
| Web unit and component tests | `bun test --isolate --timeout 20000` | `apps/web`, `packages/ui`, `packages/patterns` |
| DOM for components | jsdom via preload (`src/test/dom.ts`) | web and ui preload |
| Visual components and interaction | Storybook + `@storybook/addon-vitest` | `apps/storybook` |
| Persistence and RLS | real PostgreSQL + `bun test` | `*.integration.test.ts` |
| E2E | Playwright | `e2e/` |
| Where a test lives | colocated with the source; `src/test/` is infra, never a mirror tree | all workspaces |
| Coverage | not measured | none |

Coverage is deliberately not measured, and the absence is not a defect.
Coverage measures execution, not verification; what protects the product is the
set of risk classes covered per state. If it ever becomes a number, these are
the details that switch the gate off silently:

- `coverageThreshold` is a fraction (`0.9`, not `90`), and the real gate is
  `lines` and `functions`. `statements` is accepted but not enforced.
- Outside `--parallel` the threshold is only checked with the `text` reporter
  enabled. With only `lcov` the process exits `0` even below the number.
- `__snapshots__/` is versioned, and `-u` never appears in the CI command.
  Otherwise the snapshot becomes a recording instead of a check.

## 7. Environment and CI

### Local

```sh
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run test
bun run storybook:test
bun run test:e2e
```

Without the services running, `bun run test:unit` runs the layer that does not
need them and exits green. The integration layer fails naming the prerequisite,
never silently.

### CI

CI must contain every layer: `bun run lint:ci`, `bun run typecheck`,
`bun run test` (with PostgreSQL and `db:migrate` applied first), `bun run build`,
`bun run storybook:test` and `bun run test:e2e` (PostgreSQL, migration, seed,
report and traces published on failure). A verification that does not run in CI
is not a merge guarantee. Layers left out of the pipeline rot in silence.

### Isolation

- Ephemeral database or schema per run for parallel suites; unique ids.
- `E2E_PORT_OFFSET` to run several E2E sets without port collision.
- A new migration is validated on a clean database before merge.

## 8. Definition of done per change

Pick the layer proportional to the risk. Do not add all of them. Before the
first line, answer "what can go wrong" and derive level, case technique and
test double from it.

- Positive case of the behavior in question.
- Negative and permission cases when a role, an authorization or a forbidden
  state exists.
- Tenant and rollback when persistence is touched: two organizations, no
  context, `WITH CHECK`.
- Elysia route: input validation, error mapping and status.
- Web component: observable behavior (role, accessible name) across the five
  flow states, loading, empty, error, success and recovery, proportional to
  the risk.
- Input boundaries: boundary values, invalid classes, invalid transitions,
  whenever there is input to exercise.
- Critical journey (optional, few): E2E only when the journey really is one.
  A business rule is never an E2E.
