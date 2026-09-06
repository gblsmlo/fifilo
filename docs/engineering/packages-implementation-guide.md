# Packages implementation guide

How to implement inside `packages/`: the dependency graph, barrels, exports and
the ownership of each package. The normative rules are Decision 001; this guide
is the operational form.

## Expected dependency map

```text
apps/web       -> core (contracts), auth/client, infra-env/client, patterns, ui
               -> apps/api/server            (import type { App } only)
apps/api       -> core, auth/server, infra-env/server, infra-database, observability/runtime
apps/storybook -> ui, patterns; apps/web through the @features, @web, @libs aliases
core           -> zod and pure primitives
auth           -> infra-database, infra-env, observability, Better Auth
infra/env      -> zod and the runtime helper
infra/database -> infra-env, observability, Drizzle, PostgreSQL, better-auth/crypto for the seed
observability  -> pino, pino-pretty
patterns       -> ui, React, lucide-react           (never @features, core, router, api)
ui             -> React, Base UI, cva, clsx, tailwind-merge, lucide-react (never core, auth, env, database)
```

Explicit negatives: `core` never imports `infra-database`, `auth`, Elysia or
`observability`; `infra-database` never imports `auth`, so the seed hashes the
password with `better-auth/crypto` instead of pulling the auth server;
`ui` never imports `patterns`; a package never depends on the root to satisfy an
import its own code uses.

## Barrels and side effects

A package with an initializable runtime does no work in its root barrel. Env,
auth, database and observability publish explicit subpaths:
`@twincam/infra-env/server`, `@twincam/auth/server`,
`@twincam/infra-database/client`, `@twincam/observability/runtime`. The root
import must not construct Pino, read the environment, open a connection or
configure auth. Types and pure context may live in runtime-free subpaths.

`packages/ui` has no root barrel: every component is a subpath
(`@twincam/ui/components/button`), and `./components/*.test` is closed in
`exports`. `packages/patterns` publishes one subpath per composition.

## Dependency discipline

- Declare every imported dependency in the package's own manifest, in the
  correct section. React and Base UI are `peerDependencies` of `ui` and
  `patterns`, repeated in `devDependencies` for tests.
- Shared versions come from the root `workspaces.catalog` as `catalog:`.
- Never fix a missing dependency by adding it only to the root. A test in
  `apps/api` asserts that every package the source imports is declared.
- Inside a package, import own modules by relative path. `@twincam/<package>`
  is for external consumers only; `packages/ui` and `packages/patterns` assert
  this in a boundary test.
- Verify that each export is necessary and leaks no database schema, server
  environment or runtime adapter to the client.

## Core

- `src/contracts/` is the kernel: public HTTP contracts consumed by more than
  one capability or app, `result.ts`, `errors.ts`, `primitives.ts`.
- A capability gets `src/<capability>/` with its rules, use cases, ports and
  `schemas.ts`, published as its own subpath (Decision 012).
- Core never knows Drizzle or tables. `Result` carries expected failures; the API
  adapter maps them to HTTP.
- A public contract is never auto-derived from a Drizzle schema. Field selection
  and serialization are explicit.

## Database

- The Drizzle schema in `src/schema.ts` is the persistence source. Internal
  schemas derived with `drizzle-zod` live here; public contracts live in Core;
  mappers between them belong to the API adapter.
- A tenant-aware repository joins the workspace transaction and never swaps the
  executor for a standalone connection. `set_config` runs in the same
  transaction as the operations (Decision 004).
- Migrations are versioned in `drizzle/`; `db:push` is local development only.

## Shared UI

- Neutral. Internal imports are relative; only published subpaths are exposed.
- Test and Storybook dependencies stay in `devDependencies`; consumers never
  rely on hoisting to compile the package.
- Every published component or pattern has a story in `apps/storybook`.

## Before editing a package

1. Identify the owner of the capability you touch and read its decision.
2. Check whether the import you need is already published; publish a subpath
   instead of importing an internal path.
3. Add the dependency to the package manifest with `bun add`, never by hand.
4. Keep the root barrel free of runtime.
5. Run the package tests and the consumers' typecheck.

## Delivery checklist

- Owner identified; no new cycle in the graph.
- `exports` and barrels reviewed.
- Core free of infrastructure.
- Transactions preserve isolation and rollback.
- Package and consumer tests run; `bun run lint:ci`, `bun run typecheck`,
  `git diff --check`.
