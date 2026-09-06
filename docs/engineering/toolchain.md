# Toolchain, image and CI

The repository's tool chain: the Docker image in a Bun monorepo, the local
quality gates and what runs in CI.

## Versions

Bun `1.3.14` and Node `24.18.0` are pinned in `packageManager`, `.bun-version`,
`.node-version` and `.nvmrc`; keep the four aligned. Use the official Bun
runtime, not one installed through NVM or npm. `sh scripts/check-toolchain.sh`
verifies both; the hooks source it, and it activates the pinned Node when the
shell resolves another version: `fnm`, then `nvm.sh`, then the version
directory a fish `nvm` keeps under `$nvm_data` (`~/.local/share/nvm` by
default), which ships no POSIX entrypoint to source. It fails only when none of
them has that version installed.

## Docker in a Bun monorepo

`bun.lock` represents the whole workspace graph. An image that installs with
`bun install --frozen-lockfile` must receive every workspace the lockfile
references before the install:

```dockerfile
FROM oven/bun:1.3.14 AS base

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json tsconfig.json biome.json ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile
```

Only after the install does the Dockerfile change `WORKDIR` to the app. Cache
optimizations must not break the premise that every workspace in the lockfile
exists in the install context.

In development Compose bind-mounts the checkout. With `.:/app`, a named volume
at `/app/node_modules` is mandatory; without it the mount overwrites the
`node_modules` the image installed. The web service inside Compose reaches the
API through `API_BASE_URL=http://api:3001`.

Gate for a PR that changes a Dockerfile, Compose or a runtime package boundary:
`bun run lint:ci`, `bun run typecheck`, `bun run build`,
`docker compose config --quiet`, `docker compose build`, and a smoke import of
the root barrels to confirm they stay side-effect free.

## Local quality

Biome is the single formatter, linter and import organizer, with
`noFloatingPromises` as an error and `--error-on-warnings` in CI. Root scripts:

| Script | Runs |
| --- | --- |
| `lint` | `biome check --write .` |
| `lint:ci` | `biome ci --error-on-warnings .` |
| `lint:staged` | `biome check --staged --no-errors-on-unmatched --write .` |
| `lint:format`, `lint:unsafe` | formatter only; unsafe fixes, never in a hook |
| `typecheck` | every workspace plus `scripts/tsconfig.json` (E2E and config files) |
| `test` | `bun test` in every workspace that declares it |
| `build` | API and Web |
| `storybook:test` | every story in headless Chromium |
| `test:e2e` | Playwright journeys |
| `commit` | Commitizen prompt with `cz-git` |

Hooks, versioned by Husky:

```sh
# .husky/pre-commit
set -e
. scripts/check-toolchain.sh
bun run lint:staged
git update-index --again
```

```sh
# .husky/pre-push
set -e
. scripts/check-toolchain.sh
bun run lint:ci
bun run typecheck
```

```sh
# .husky/commit-msg
set -e
sh scripts/check-toolchain.sh
bunx --no-install commitlint --edit "$1"
```

Commits follow Conventional Commits with the standard types; scopes are
optional; no AI attribution trailer.

## Claude Code hooks

`.claude/settings.json` mirrors the gates for an agent: the session reports a
toolchain mismatch, a Bash call through npm, npx, yarn or pnpm is blocked, every
edited file is formatted, and a delivery cannot end with a dirty tree that fails
`git diff --check` or `lint:ci`. `.claude/settings.local.json` is machine-local
and gitignored.

## CI

`.github/workflows/ci.yml` runs on pull requests to `main` and pushes to `main`,
with `concurrency` per ref. Four jobs:

| Job | Runs |
| --- | --- |
| `quality` | toolchain check, frozen install, `lint:ci`, `typecheck`, `scripts/ci-env.sh`, `db:migrate`, `test` against PostgreSQL 17 |
| `build` | `bun run build` |
| `storybook` | Chromium installed from `apps/storybook`, `storybook:test` |
| `e2e` | migrate, seed, `test:e2e`, report uploaded on failure |

CI repeats `lint:ci` and `typecheck` because local hooks can be skipped. The
reasons that are not obvious in the YAML live in
`.github/workflows/README.md`.

## Supply chain

Lockfile versioned and `packageManager` pinned; dependencies declared by the
package that imports them, never satisfied by root hoisting (Decision 001);
copied UI components record origin and version in `packages/ui/docs`; the
OpenAPI document, served in development, is the artifact to diff when a public
contract changes.
