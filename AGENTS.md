# Agent Instructions

## Toolchain

- Bun `1.3.14`, Node `24.18.0` (`.node-version` is the source of truth). Use the
  official Bun runtime, not one installed through NVM or npm.
- `bun install` · `bun run dev:web` · `bun run dev:api` · `bun run storybook`.
- Keep `.bun-version`, `.node-version`, `.nvmrc` and `packageManager` aligned.
- `pre-commit` and `pre-push` source `scripts/check-toolchain.sh`, which
  activates the pinned Node through `fnm` or `nvm` when the shell resolves
  another version. It fails only when neither manager has that version.
- Run Drizzle Kit from `packages/infra/database`; `drizzle.config.ts` uses paths
  relative to that package.
- Never edit a generated lockfile by hand.

## Validation

The `Stop` hook in `.claude/settings.json` runs `git diff --check` and
`lint:ci` on every delivery with a dirty tree, and `PostToolUse` formats the
edited file. `pre-push` runs `lint:ci` and `typecheck`. CI runs those plus
`bun test`, `storybook:test` and `test:e2e` against PostgreSQL.

Pick validation proportional to the change and report an environmental blocker
honestly instead of hiding it behind a green summary:

- `bun run lint:ci`, `bun run typecheck`, `bun run test`: always.
- `bun run storybook:test`: a component, pattern or story changed.
- `bun run test:e2e`: a route, session or persistence journey changed.
- `bun run build`, `docker compose build`: a Dockerfile, Compose file or
  runtime package boundary changed.

A tenant-aware database change needs negative coverage with at least two
organizations, rollback, `WITH CHECK` and no-context access.

### Storybook is a test layer, not a catalog

Every story is a test: a render smoke test at minimum, behavior when it has a
`play`. This is Decision 009; do not describe Storybook as a showcase. The
catalog is a consequence, ordered by the Atomic ladder (Decision 010).

One behavior, one layer. The criterion is **what jsdom does not have**:

| The behavior depends on | Layer | Runner |
| --- | --- | --- |
| layout, real focus, portal, pointer, a11y, or is a user interaction | story with `play` | `bun run storybook:test` |
| component logic, derivation, formatting, a render branch with no real DOM | `bun test` | `bun run test` |
| a journey across routes, session and persistence | E2E | `bun run test:e2e` |

A component whose `.test.tsx` and story `play` assert the same thing is a
finding: delete the one in the wrong layer. `docs/engineering/test-plan.md`
carries the operational detail.

## Where to start

- Architecture: `docs/00-architecture-map.md` names the active source for each
  boundary. `docs/README.md` maps question → source.
- Adding a capability: `docs/engineering/feature-delivery-flow.md`, then the
  skills in build order: `/engineering-contract` → `/engineering-persistence` →
  `/engineering-api` → `/engineering-web`. `/engineering-validation` closes,
  `/engineering-review` reviews, `/engineering-refactor` audits a delivered
  slice against the boundaries.
- Reference feature: `apps/web/src/features/auth` in Web,
  `apps/api/src/features/auth` in the API.
- Technology skills (React, TanStack, Elysia, Drizzle, Bun, HTTP, Playwright,
  Storybook) are installed globally from the maintainer's vault, not versioned
  here. A decision or guide in this repository always wins over them.

## Decisions

- `docs/decisions/README.md` is the resolver: number → file → state. Cite
  `Decision NNN` and link the index; never address the decision file. The same
  holds for `BUG-NNN` and `docs/bugs/README.md`.
- Record a decision when a change alters an invariant, a shared contract, a
  bounded-context boundary, an ownership model or an irreversible workflow.
- A document holds only what only it holds. Point to the decision or guide
  instead of repeating the rule.

## Rules no gate catches

### Scope

- Do not anticipate hypothetical future needs. Build for the current consumers;
  avoid versioning, abstraction or compatibility mechanisms justified only by a
  possible future. Simple current design is cheaper to evolve.
- Before creating a utility, helper, wrapper or shared abstraction, find the
  existing pattern and prefer extending it over adding a parallel one.
- This starter is domain-neutral. Business entities, product roles, billing,
  analytics and delivery providers belong to the product built on top of it.

### Code clarity

- Comment only what the code cannot say: the reason for a choice, an external
  constraint, a non-obvious decision. Never restate the next line or the name.
- Never narrate the change in the code. What a symbol used to be or which
  refactor moved it is changelog; `git log` holds it.
- Do not restate a rule a gate or a decision already enforces. Cite the decision
  once, where it applies.
- JSDoc addresses a caller who does not have the file open: a public prop read
  by Storybook autodocs, a contract the type cannot carry, `@see`,
  `@deprecated`. A local choice is a `//` comment.

### apps/web

- Route groups use `(group)/route.tsx`. Never the `_` prefix, `layout.tsx` or
  `page.tsx`. Authenticated routes live under `(authenticated)/route.tsx`,
  public auth routes under `(auth)/route.tsx`; the session guard is
  `(authenticated)/route.tsx`.
- Client HTTP adapters are `http/`, not `api/`. "API" is `apps/api`, its routes
  and its public contracts. Routes are reached through `api.<resource>` from
  `@libs/api-client`, never through a literal `'/api/...'` (Decision 013).
- Feature shape is Decision 007; `apps/web/src/features/auth` is the model.
  Inside `components/`, group by kind only when a clear group exists; never
  create an empty folder.
- Server state in TanStack Query, form state in React Hook Form, URL state in
  TanStack Router, Zustand only for ephemeral UI state.
- Component ownership follows `docs/engineering/component-ownership.md`
  (Decision 006). A neutral primitive or pattern belongs in `packages/ui` or
  `packages/patterns` with a public subpath, tests in the package and a story
  in `apps/storybook`. Never copy, rename or wrap a neutral component in Web
  without an application-specific responsibility.
- A shell receives its environment as a prop; the route is the only reader.

### Backend and data

- Use `Result` for expected domain failures; the API adapter maps them to HTTP.
- Validate at the boundary: schemas in the route `options`, never `safeParse`
  inside the handler (Decision 002). Schemas live in `packages/core`.
- Derive internal persistence schemas from Drizzle with `drizzle-zod`; define
  public contracts explicitly in `packages/core/src/contracts`.
- In a `repository.ts` that is a composition root, never add SQL, `*Row` types,
  mappers or capability implementation (Decision 003).
- Validate environment variables through `packages/infra/env`. A module used by
  tooling uses the shared runtime helper, not `Bun.env`.
- A root `index.ts` never initializes env parsing, database connections, auth
  server setup or any other runtime side effect.
- `packages/infra/database` never imports `@twincam/auth`.

### Docker

- A Dockerfile copies every Bun workspace the lockfile requires before
  `bun install --frozen-lockfile`.
- A Compose service that bind-mounts `.:/app` keeps a named `/app/node_modules`
  volume.

## Delivery

- Conventional Commits; scopes are optional. No `Co-Authored-By` trailer for
  coding agents.
- Open PRs with `.github/pull_request_template.md`: fill the applicable sections
  and delete the ones that do not apply.
- Before requesting review, run `/engineering-review`. A change touching Docker
  or a runtime package boundary also runs `bun run build` and
  `docker compose build`.
