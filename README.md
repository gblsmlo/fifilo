# Twincam Monorepo

[![Bun](https://img.shields.io/badge/Bun-1.3.14-f9f1e1?logo=bun&logoColor=000)](https://bun.sh)
[![Node.js](https://img.shields.io/badge/Node.js-24.18.0-339933?logo=nodedotjs&logoColor=fff)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A production-minded, domain-neutral foundation for building tenant-aware SaaS
products without recreating the monorepo, authentication and organization
boilerplate.

Twincam provides the reusable platform layer. A product adds its own business
capabilities as vertical slices, following the delivery flow the repository
documents.

## What is included

- Email and password authentication, password recovery, two-factor
- Organizations, memberships, invitations with expiration, active organization
- `owner`, `admin` and `member` organization roles, protected API actor resolution
- Organization onboarding and workspace switching in a domain-neutral shell
- Replaceable notification outbox
- Shared UI primitives, neutral patterns, and Storybook as the component test layer
- Playwright journeys for the auth flows
- PostgreSQL migrations and development seed
- Docker images, Docker Compose and a four-job GitHub Actions pipeline
- Repository skills and Claude Code hooks for agent-driven work

## What is intentionally not included

Billing, analytics, file storage, queues, product-specific roles, business
entities and email delivery providers are deliberately left out. The
notification outbox records authentication and invitation messages; a product
connects it to its delivery provider.

## Technology

| Layer | Technology |
| --- | --- |
| Runtime and package manager | Bun 1.3.14 |
| JavaScript toolchain | Node.js 24.18.0 LTS |
| Web | React 19, TanStack Start, TanStack Router, TanStack Query |
| Forms and validation | React Hook Form, Zod |
| API | Elysia, Eden Treaty as the typed client |
| Authentication | Better Auth |
| Database | PostgreSQL 17, Drizzle ORM |
| UI | Base UI, Tailwind CSS 4, shared primitives and patterns |
| Quality | TypeScript, Biome, Bun Test, Storybook with `addon-vitest`, Playwright |
| Operations | Docker Compose, GitHub Actions, structured logging |

## Architecture

```text
apps/web ─── import type { App } ───┐
   │                                ├──> apps/api ──> packages/core
   ├──> packages/patterns ──> packages/ui         │
   └──> packages/core (contracts)                 ├──> packages/auth
                                                  └──> packages/infra/database
packages/infra/env, packages/observability ──> every process, by subpath
```

- `packages/core` holds framework-independent contracts, `Result` and use cases.
- `apps/api` is one vertical slice per capability; routes are thin and validate
  in `options`; `repository.ts` only composes adapters.
- `apps/web` reaches the API through the Eden client built over the API's type;
  routes only compose feature pages.
- Packages resolve each other only through published `exports`; no root barrel
  initializes a runtime.
- UI ownership climbs `ui` → `patterns` → `layouts` → `features`.

Authentication identifies the user. The active organization and membership
determine which tenant the request may access, always resolved from
server-controlled session state.

Start at [docs/README.md](docs/README.md); the
[architecture map](docs/00-architecture-map.md) names the active source for
each boundary, and [docs/decisions](docs/decisions/README.md) explains why.

## Repository structure

```text
.
├── apps
│   ├── api                 # Elysia API: features/{auth,health,users}, libs
│   ├── storybook           # Component test layer for ui, patterns, layouts, features, pages
│   └── web                 # TanStack Start application
├── packages
│   ├── auth                # Better Auth server and client, organization policy
│   ├── core                # Public contracts, Result, primitives
│   ├── infra
│   │   ├── database        # Drizzle schema, migrations, workspace transaction, seed
│   │   └── env             # Typed environment validation per process
│   ├── observability       # Structured logging, tracing and audit
│   ├── patterns            # Domain-neutral compositions over ui
│   └── ui                  # Domain-neutral primitives
├── e2e                     # Playwright journeys
├── docs                    # Map, guides, decisions, known bugs, plans
├── .agents/skills          # Repository skills, exposed through .claude/skills
├── infra/docker            # Production image definitions
└── scripts                 # Toolchain and CI helpers
```

## Requirements

- [Bun 1.3.14](https://bun.sh)
- [Node.js 24.18.0 LTS](https://nodejs.org)
- [Docker with Compose](https://docs.docker.com/compose/)

The required versions are recorded in `.bun-version`, `.node-version` and the
root `packageManager` field. `sh scripts/check-toolchain.sh` verifies them and
activates the pinned Node through `fnm` or `nvm`.

## Quick start

```bash
git clone git@github.com:gblsmlo/twincam-monorepo.git
cd twincam-monorepo
cp .env.example .env
bun install

docker compose up -d --wait postgres
bun run db:migrate
bun run db:seed
bun run dev
```

| Service | URL |
| --- | --- |
| Web application | `http://localhost:3000` |
| API | `http://localhost:3001` |
| API health check | `http://localhost:3001/health` |
| OpenAPI reference (development only) | `http://localhost:3001/openapi` |
| Storybook | `http://localhost:6006` after `bun run storybook` |

The development seed creates:

```text
Email:    owner@twincam.local
Password: change-this-owner-password
```

These credentials and the default `BETTER_AUTH_SECRET` are strictly for local
development. Replace them before exposing any environment.

## Environment configuration

Copy `.env.example` to `.env`. Every variable, who reads it and why is in
[docs/engineering/environment.md](docs/engineering/environment.md). Server
variables are validated by `packages/infra/env`; server-only values never travel
through `VITE_*`.

## Common commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start development workspaces |
| `bun run dev:web`, `bun run dev:api` | Start one application |
| `bun run storybook` | Start Storybook |
| `bun run db:generate` | Generate a Drizzle migration |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:seed` | Create local development data |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run lint:ci` | Check formatting and lint rules |
| `bun run typecheck` | Typecheck every workspace and the E2E sources |
| `bun run test` | Run every workspace test suite |
| `bun run storybook:test` | Run every story in headless Chromium |
| `bun run test:e2e` | Run the Playwright journeys |
| `bun run build` | Build the API and the web application |

## Adding a business capability

Follow [docs/engineering/feature-delivery-flow.md](docs/engineering/feature-delivery-flow.md):
contracts and use cases in `packages/core`, tenant-owned tables behind the
workspace transaction with negative isolation tests, a thin slice in
`apps/api/src/features/<capability>`, the feature under
`apps/web/src/features/<capability>` in the shape of `features/auth`, stories in
`apps/storybook`, and a journey in `e2e/` when routes, session and persistence
meet. The repository skills under `.agents/skills` walk each phase.

Tenant-owned tables carry an `organization_id`. Add and test PostgreSQL
row-level security with the first business table.

## Validation

The CI pipeline runs four jobs against PostgreSQL 17:

```bash
sh scripts/check-toolchain.sh
bun install --frozen-lockfile
bun run lint:ci
bun run typecheck
bun run test
bun run build
bun run storybook:test
bun run test:e2e
```

Changes to Dockerfiles or workspace dependencies should also pass
`docker compose build`.

## Production checklist

- Generate unique authentication and database secrets.
- Configure exact application URLs and trusted origins.
- Replace or disable local seed credentials.
- Connect and monitor the notification outbox.
- Add edge rate limiting and abuse protection.
- Configure PostgreSQL backups and rehearse migration rollback.
- Add tenant-isolation tests for every business-owned table.
- Review observability fields so secrets and personal data are never logged.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture map](docs/00-architecture-map.md)
- [Decisions](docs/decisions/README.md)
- [Shared UI dependency policy](packages/ui/docs/DEPENDENCIES.md)
- [Shared UI update workflow](packages/ui/docs/UPDATE_WORKFLOW.md)

## License

Distributed under the [MIT License](LICENSE). Copyright © 2026 Gabriel Melo.
