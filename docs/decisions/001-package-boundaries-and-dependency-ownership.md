# Decision 001: package boundaries and dependency ownership

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 014; the starter keeps the rule and drops the product-specific evidence.

## Context

The monorepo declares the workspaces `apps/*`, `packages/*` and
`packages/infra/*`. Bun hoists shared dependencies to the root, so a package
can resolve a module it never declared and still work inside this checkout.
That convenience hides four classes of defect:

- a root barrel that initializes runtime on import, so a type-only import of
  `@twincam/observability` would start a Pino logger;
- a package cycle, such as the database package importing the auth server
  configuration for a seed while Auth already depends on Database;
- a tool used by a package's scripts (`drizzle-kit`) without a manifest entry;
- a workspace transaction boundary that accepts a generic executor and casts
  to the Drizzle handle, so the capability a repository needs is not visible at
  compile time.

None of these change product behavior. They break invariants of build, load,
dependency direction and transaction that the starter has to keep durable,
because every future capability is built on top of them.

## Options considered

1. **Trust the root and hoisting.** Smaller manifests, but each package only
   works inside this checkout, and cycles or undeclared imports stay hidden.
2. **Allow free barrels and internal imports.** Fewer local changes, but no way
   to guarantee that a type import does not initialize runtime, or that the
   published API is the only surface consumers touch.
3. **Explicit ownership per package, harmless barrels and typed contracts.**
   More discipline in manifests and adapters, but a reproducible, testable and
   acyclic graph.

## Decision

Adopt option 3.

### Dependency rules

- Every runtime import or tool a package uses is declared in that package's
  own `package.json`, in the correct section.
- A shared dependency is not a reason to lean on the root manifest. The root
  provides versions and common tooling; it does not replace consumer ownership.
- Versions shared by more than one package (`react`, `react-dom`,
  `@base-ui/react`, `lucide-react`, `class-variance-authority`) come from the
  root `workspaces.catalog`. The catalog is the single owner of the version.
- `@twincam/core` stays independent of Infra, Auth, Elysia, Drizzle and runtime
  observability. It depends on `zod` and nothing else.
- `@twincam/auth` may consume `@twincam/infra-env`, `@twincam/infra-database`
  and `@twincam/observability`. `@twincam/infra-database` never imports
  `@twincam/auth`.
- Seeds, migrations and spikes belong to the database package. They may use a
  library such as `better-auth/crypto` directly, but never the configured auth
  server. A capability they need is injected or kept in tooling with no reverse
  dependency.
- Shared UI packages classify React and the primitive library by distribution
  contract: `peerDependencies` when the consumer supplies the instance
  (`react`, `@base-ui/react`), `dependencies` when the package owns the copy
  (`clsx`, `tailwind-merge`), `devDependencies` only for tests and tooling.

### Exports and imports

- The root barrel of `@twincam/infra-env`, `@twincam/auth`,
  `@twincam/infra-database` and `@twincam/observability` is pure. Server,
  client and tooling contexts are explicit subpaths: `@twincam/auth/server`,
  `@twincam/auth/client`, `@twincam/observability/runtime`,
  `@twincam/infra-env/server`, `@twincam/infra-database/workspace`.
- `@twincam/core` has no runtime barrel at all. Consumers import
  `@twincam/core/contracts/<name>`, `@twincam/core/result`,
  `@twincam/core/errors` or `@twincam/core/primitives`.
- `@twincam/ui` and `@twincam/patterns` publish only subpaths
  (`@twincam/ui/components/button`, `@twincam/patterns/confirm-dialog`).
- Inside a package, own modules are imported by relative path
  (`../lib/utils`), never by the package's published name.
- A consumer in another workspace uses only what the `exports` map publishes.
  Deep paths into `src/` are not allowed.

### Transaction rules

- The workspace boundary in `packages/infra/database/src/workspace.ts`
  declares at compile time both the minimum capability to apply `set_config`
  (`WorkspaceExecutor`) and the Drizzle handle delivered to repositories
  (`WorkspaceTx` through `Transactional<Tx>`).
- The cast between the transaction handle and the RLS executor is confined to
  that named module. It never appears in a feature slice.
- Every change preserves a single transaction, rollback, isolation by
  organization, actor context and the Drizzle builder, as Decision 003 and
  Decision 004 require.

## Consequences

- Filtered installs and isolated builds reveal missing dependencies before CI
  or production does.
- The package graph stays acyclic and easy to draw: Core at the center, Infra
  and Auth around it, apps at the edge.
- Pure barrels stop tests, tooling and type imports from starting runtimes by
  accident.
- Manifests and imports get more verbose. A package that starts consuming a new
  capability needs a manifest change and a review.
- The boundary is enforced by the `exports` maps, by `tsconfig` and by review.
  `@twincam/ui` and `@twincam/patterns` also pin their own rules in
  `src/package-boundaries.test.ts`. A deep import or an undeclared dependency
  is a review finding.

## Revisit when

- The monorepo adopts a build or publication system that replaces the current
  `exports` maps.
- Auth, Database or Core change bounded context.
- Drizzle ships a transaction handle type that removes the RLS adapter cast.
- `packages/ui` stops being shared between Web and Storybook.
- Bun's `catalog` is discontinued or the shared-version mechanism changes.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 004 owns the Drizzle-first rule that the transaction handle serves.
- Decision 006 applies dependency ownership to the `ui` and `patterns` split.
