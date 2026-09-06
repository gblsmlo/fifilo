# BUG-001: the declared toolchain and the Compose stack did not reproduce from a clean checkout

## State

Resolved in the commit that carries this record.

## Environment

- Revision reproduced: `8d98f66`.
- Bun `1.3.14`; Node pinned at `24.18.0`, shell resolving `v22.23.2`;
  PostgreSQL `17.10` from `postgres:17`.
- Docker `29.7.2`, Compose `5.5.0`, Linux `7.1.13` (Fedora 44).
- Node manager on the machine: the fish `nvm` plugin, which keeps its versions
  under `~/.local/share/nvm` and installs no `nvm.sh`.

## Summary

Three independent defects, all found in one validation pass. Together they meant
that a checkout could not reach a running stack by following `README.md`: the
toolchain gate rejected a correct machine, the database came up with credentials
no application used, and the Storybook layer demanded a browser build the
repository never installs.

The authentication code itself was complete and correct. It had simply never
been executed against a database: the migrations had never been applied, and the
volume held an empty schema.

## Defect 1 — the toolchain gate reports the pinned Node as missing while it is installed

**Observed.** Every session opened with the gate refusing a machine that has the
required version installed:

```text
Toolchain mismatch: toolchain check failed: Node 24.18.0 is not active and not
installed in fnm or nvm. Run: install fnm or nvm, then install Node 24.18.0
```

`~/.local/share/nvm/v24.18.0/bin/node --version` printed `v24.18.0` at the same
time.

**Cause,** verified by reading the failing branch: `activate_pinned_node` tried
`fnm`, then `$HOME/.nvm/nvm.sh`. The fish `nvm` plugin stores each version as a
plain directory under `$nvm_data` and ships no POSIX entrypoint to source, so
neither branch could reach an installation that was present. The gate then
reported absence, which is not what it had observed.

**Fix.** A third fallback puts `$nvm_data/v<version>/bin` on `PATH` when it holds
an executable `node`; the `nvm.sh` branch now honours an existing `$NVM_DIR`
instead of assuming `$HOME/.nvm`. `node_install_hint` recognises the same layout.

**Closing condition.** From a shell that resolves another Node,
`. scripts/check-toolchain.sh` exits `0` and leaves `node --version` at
`v24.18.0`. Verified.

## Defect 2 — Compose initialises PostgreSQL with credentials no application reads

**Observed.** `docker-compose.yml` carried `twincam` as a literal in
`POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD`, while `.env` had been
renamed and pointed every connection URL at `fifilo`. The running container
exposed a `twincam` database; `bun run db:migrate` had never been able to
connect, and `psql -l` showed no `fifilo` database at all.

**Cause,** verified in the resolved configuration: the credentials the image
bakes into the data directory on first start were written twice — as literals in
the service, and inside the connection URLs. Renaming the project updated one
copy.

A second, latent fault sat in the same service: it declared no healthcheck, so
`docker compose up -d postgres` returned before the server accepted connections
and the `bun run db:migrate` the quickstart runs next raced the initialisation of
a cold volume.

**Fix.** `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` come from the env
file and feed both the service and the URLs built from them. The service gained a
`pg_isready` healthcheck; `api` and `web`, which both open a pool at import time,
gained `depends_on: service_healthy`. The quickstart and the package `dev` script
use `docker compose up -d --wait postgres`.

**Closing condition.** On a volume created from scratch, `docker compose up -d
--wait postgres` reports the container healthy, and `db:migrate`, `db:seed` and
the full stack run against it without an intermediate retry. Verified.

## Defect 3 — two Playwright versions in one workspace

**Observed.** `bun run storybook:test` failed before running a story:

```text
error during close browserType.launch: Executable doesn't exist at
/home/gabs/.cache/ms-playwright/chromium_headless_shell-1208/...
```

The E2E layer passed at the same time, on the browser build it had installed.

**Cause,** verified in `bun.lock`: `apps/storybook` pinned `playwright` at
`1.58.2` while the root `@playwright/test` range resolved to `1.61.1`. One
repository therefore required two Chromium builds, and CI compensated with a
browser install specific to `apps/storybook`.

**Fix.** Both pinned at `1.61.1`.

**Closing condition.** `grep -o 'playwright@1\.[0-9.]*' bun.lock | sort -u`
yields a single version, and `storybook:test` and `test:e2e` both pass on one
installed browser build. Verified.

## Not a defect

`POST /api/auth/sign-out` answers `403 MISSING_OR_NULL_ORIGIN` to a request that
carries no `Origin` header. This is Better Auth's CSRF protection behaving
correctly: a browser always sends `Origin` on a same-site POST, and the same call
with the header returns `200`. Recorded so a `curl` reproduction is not filed as
an authentication defect.

## Closing evidence

After the three fixes, on a database created from scratch:

- `db:migrate` applied the nine tables; `db:generate` reported no drift against
  `packages/infra/database/src/schema.ts`; `db:seed` created the owner,
  organisation and credential account.
- Over HTTP: sign-up `201`, duplicate sign-up `409`, sign-in `200` with cookie,
  `/api/me` `401` without a session and `200` with one, organisation creation
  resolving `role: owner` on the next `/api/me`, sign-out `200`, `/api/me` back
  to `401`.
- The Compose stack came up with `api` and `web` held until PostgreSQL was
  healthy; the seeded owner authenticated through it and the web `/login`
  responded `200`.
- `lint:ci`, `typecheck`, `test` (113), `storybook:test` (130), `test:e2e` (9),
  `build` and `docker compose build` all passed.

## Hypotheses left open

None on the causes: each was confirmed by re-running the failing command after
the change.

One limit of the evidence is worth naming. Defect 1 was reproduced and closed on
a machine using the fish `nvm` plugin. The `fnm` and `nvm.sh` branches were
widened, not rewritten, and neither manager was installed here, so those two
paths are unchanged but were not re-executed.

## Related

- [`docs/bugs/README.md`](README.md) resolves `BUG-NNN` → file → state.
- [Toolchain, image and CI](../engineering/toolchain.md) documents the gate and
  the manager lookup order.
- [Environment](../engineering/environment.md) documents the `POSTGRES_*`
  variables and the rule that a credential change needs a new volume.
