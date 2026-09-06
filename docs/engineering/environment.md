# Environment variables

Every environment read goes through `packages/infra/env`, which validates with
Zod and publishes typed access by subpath. No module reads `process.env`,
`Bun.env` or `import.meta.env` directly outside that package. A module consumed
by tooling must work outside Bun: it uses the shared runtime helper, never
`Bun.env`.

## File shape

```text
packages/infra/env/src/
  index.ts        empty; re-exports nothing that parses the environment
  runtime.ts      readRuntimeEnv(): Bun.env when available, process.env otherwise
  server.ts       API; may hold secrets
  web-server.ts   the web SSR process: where the API listens
  migration.ts    Drizzle Kit and administrative migration tasks
  client.ts       public variables only, VITE_* prefix
  spike.ts        flags for destructive local spikes
```

The `exports` map publishes `./server`, `./web-server`, `./migration`,
`./client` and `./spike`. The root import exists only to keep the package
resolvable and exports no value. Runtime code imports the subpath of its own
process, so the client, Drizzle Kit, scripts and shared packages never load a
variable that does not belong to them.

Each module exposes a factory (`createServerEnv`, `createWebServerEnv`,
`createMigrationEnv`, `createClientEnv`) that accepts an injected `RuntimeEnv`.
Tests and controlled overrides use the factory instead of mutating the process
environment.

## Variables

| Variable | Read by | Purpose |
| --- | --- | --- |
| `NODE_ENV` | server | `development`, `test` or `production` |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Compose | credentials the `postgres` service initializes its data directory with; `POSTGRES_USER` owns the schema and is always a superuser in the official image |
| `POSTGRES_APP_USER`, `POSTGRES_APP_PASSWORD` | migration | the non-superuser role `bun run db:bootstrap-roles` creates and `DATABASE_URL` connects as (Decision 020) |
| `API_PORT` | server, web-server | where the API listens; the web SSR process reaches it there |
| `API_BASE_URL` | web-server | optional origin of the API when it is not on `127.0.0.1:API_PORT`, such as inside Compose |
| `APP_NAME` | server | server-side product name |
| `APP_URL` | server | public origin of the web application |
| `DATABASE_URL` | server | application connection, on `POSTGRES_APP_USER` — never `POSTGRES_USER` |
| `DATABASE_MIGRATION_URL` | migration | migration connection, on `POSTGRES_USER`; a dedicated credential in deployed environments |
| `DATABASE_POOL_MAX` | server | connections per process |
| `BETTER_AUTH_SECRET` | server | at least 32 characters |
| `BETTER_AUTH_URL` | server | public origin the auth server signs against |
| `BETTER_AUTH_TRUSTED_ORIGINS` | server | comma-separated exact origins, normalized to `URL.origin` |
| `VITE_APP_ENV` | client | `development`, `staging` or `production` |
| `VITE_APP_NAME` | client | browser-visible product name |
| `ALLOW_DESTRUCTIVE_SPIKES` | spike | opt-in for tests that truncate or migrate |
| `WEB_HOST`, `WEB_PORT` | Vite | dev server bind; the E2E runner sets them |

`VITE_*` variables are public by definition: they are substituted at build time
and shipped in the bundle. Secrets, credentialed URLs and private keys never
carry the prefix and never enter the client schema. Web and API share an origin,
so no backend URL is published in the bundle; the browser calls `/api`.

## Operational rules

- Fail startup immediately on an invalid required variable. Log the variable
  name and the reason, never the value.
- Keep `.env.example` secret-free and in sync with the schemas. `.env` is
  gitignored and is the local runtime source; CI writes it with
  `scripts/ci-env.sh`.
- Use a secret manager in staging and production. Inject server secrets at
  container runtime; never bake them into the image.
- Validate the environment separately at each entrypoint: web, API, migrations.
- No silent default for a secret or a critical setting.
- Docker Compose loads `.env`, not `.env.example`. Working development values are
  explicit defaults in `docker-compose.yml`.
- The `postgres` service reads the same `POSTGRES_*` variables the connection
  URLs are built from. They apply only when the data volume is created, so a
  credential change after the first start needs `docker compose down -v`.
- `bun run db:bootstrap-roles` runs once per database, right after
  `docker compose up -d --wait postgres` and before the first `db:migrate`: it
  is idempotent, safe to run again after a password rotation. Skipping it does
  not fail loudly — every query keeps working, because `POSTGRES_USER` is a
  superuser and every `FORCE ROW LEVEL SECURITY` policy stays inert for it
  (Decision 020). CI runs it as its own step, before `db:migrate`, in every job
  that touches the database.

## Reusable schema pieces

`server.ts` defines an origin schema that rejects a path, query or hash and
normalizes to `URL.origin`, a CSV-preprocessed array of origins for trusted
origins, `z.coerce.number().int()` for ports and pool size, and
`z.string().min(32)` for the auth secret. Reuse them instead of redeclaring.
