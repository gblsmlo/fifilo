# Architecture map

Status: active and canonical for locating technical responsibilities.

This map records the current state of the repository. It does not replace the
decisions; it points the reader to the active source and keeps historical
material from guiding new code.

## Precedence

When documents conflict:

1. `AGENTS.md` defines the executable rules for working in the repository.
2. This map identifies the active source for each boundary.
3. `docs/engineering/architecture.md` keeps what no decision or guide governs.
4. `docs/decisions/` records cross-cutting, durable choices.
5. `docs/plans/` and Git history provide evidence and context, but authorize no
   new structure or behavior.

## Responsibilities

| Responsibility | Active source of truth | Allowed consumers |
| --- | --- | --- |
| Public HTTP contracts | `packages/core/src/contracts` | Web and API adapters |
| Rules, use cases and ports of a capability | `packages/core/src/<capability>` | API adapters and tests |
| Domain primitives | `packages/core/src/primitives.ts` | Core subdomains and adapters |
| `Result` and expected errors | `packages/core/src/result.ts`, `packages/core/src/errors.ts` | Use cases and adapters |
| Persistence and SQL projections | `packages/infra/database` | API and tooling |
| Authentication | `packages/auth` | Web and API through the published subpaths |
| Environment | `packages/infra/env` | Every process through its own subpath |
| Observability | `packages/observability` | Apps through `./runtime`; types through the root |
| Shared UI, primitives | `packages/ui` | Web, `packages/patterns` and Storybook through published exports |
| Shared UI, compositions | `packages/patterns` | Web and Storybook through published exports |
| HTTP routes | `apps/api/src/features/<capability>/<x>.routes.ts` | HTTP clients; no business rule of their own |
| Persistence adapters | `apps/api/src/features/<capability>/*-persistence.ts` | The slice itself, through `repository.ts` |
| API infrastructure with no capability owner | `apps/api/src/libs` | Any API slice |
| Web routes | `apps/web/src/routes` | Router; loaders, search and thin composition |
| Web behavior | `apps/web/src/features` | Routes and the feature's own components |
| Shell and navigation | `apps/web/src/layouts` | Route groups |
| Web to API client | `apps/web/src/libs/api-client.ts` | Feature `http/` adapters |
| Component tests in a browser | `apps/storybook` | Stories of `ui`, `patterns`, `layouts`, `features` and pages |
| Journeys | `e2e/` | Runs against Web and API over HTTP |

## Structure of `apps/api`

One vertical slice per capability. Route, adapter, mapper and test of the same
capability live together; what belongs to no capability lives in `libs/`.

```text
apps/api/src/
├── app.ts                       composition, exercisable through app.handle()
├── server.ts                    listen; exports `type App`
├── openapi.ts                   reference served in development only
├── features/<capability>/
│   ├── <x>.routes.ts + <x>.routes.test.ts
│   ├── <x>.mapper.ts            domain -> public DTO, when the shapes differ
│   ├── repository.ts            composition of the adapters
│   ├── *-persistence.ts         the adapters
│   └── index.ts                 public surface of the slice
├── libs/                        HTTP errors, domain error status, idempotency
└── test/                        integration prerequisites
```

A slice imports another slice through its barrel, never through an internal
path. There are no `routes/` or `persistence/` top-level folders: grouping by
technical role scatters one capability across directories.

## Structure of a Web feature

`apps/web/src/features/auth` is the model (Decision 007). Route files only
compose a page; the feature holds `http/`, `hooks/`, `pages/`, `components/`,
`schemas/`, `utils/`, `storybook/` fixtures and an `index.ts` public surface.

## Active packages

- `packages/core`: shared kernel, public contracts and capability subdomains.
- `packages/auth`: Better Auth server and client, organization policy.
- `packages/infra/env`: environment validation and per-process entrypoints.
- `packages/infra/database`: Drizzle schema, migrations, workspace transaction.
- `packages/observability`: context, logs, traces and technical audit.
- `packages/ui`: visual primitives with no feature behavior.
- `packages/patterns`: reusable compositions over `packages/ui`, with no domain
  vocabulary and no feature dependency.

## Canonical flows

### Public request

```text
Web
  -> public contract in @twincam/core/contracts/<capability>
  -> Eden client in apps/web/src/libs/api-client.ts
  -> thin route in apps/api/src/features/<capability>
  -> use case in @twincam/core/<capability>
  -> Core port
  -> adapter in the same slice
  -> workspace transaction in @twincam/infra-database
```

### Frontend

```text
route (URL, loader, search)
  -> feature page
  -> feature hooks and http/
  -> public contract
  -> packages/patterns by published subpath (compositions)
  -> packages/ui by published subpath (primitives)
```

Navigation groups do not create modules in Core or in the API. A technical
capability exists only when it has its own language, rules and use cases.

## Active sources

| Source | Use |
| --- | --- |
| `docs/engineering/architecture.md` | stack, organizations, identifiers at the persistence boundary, security baseline |
| `docs/engineering/component-ownership.md` | where a frontend component lives, and who may import it |
| `docs/engineering/environment.md` | environment variables and their consumers |
| `docs/engineering/observability.md` | context, logs, traces and technical audit |
| `docs/engineering/toolchain.md` | Docker in the Bun monorepo, local hooks and CI |
| `docs/engineering/operation.md` | idempotency, concurrency, migrations and rollout |
| `docs/engineering/packages-implementation-guide.md` | implementing inside the packages |
| `docs/engineering/api-implementation-guide.md` | composition and modules of the API |
| `docs/engineering/drizzle-first-persistence.md` | operational baseline for persistence |
| `docs/engineering/feature-delivery-flow.md` | the order of one vertical slice |
| `docs/engineering/testing.md`, `docs/engineering/test-plan.md` | strategy, layers and commands |
| `docs/engineering/security.md` | access, tenant isolation and data |
| `docs/decisions/README.md` | index of durable decisions |

## Enforcement

Boundaries are enforced by the `exports` maps of each package, by the absence
of `@twincam/*` entries in `tsconfig.base.json` paths, by per-package boundary
tests where the rule is cheap to assert, and by review. No dedicated
architecture script exists; adding one is a decision to revisit when a cycle
between packages or a conditional rule per export appears.
