# BUG-005: the production web build does not render, and cannot serve the API path

## State

Partial. Tracked by [gblsmlo/fifilo#3](https://github.com/gblsmlo/fifilo/issues/3).
Problem 1 is resolved in the commit that carries this update. Problem 2 turned
out not to be a defect at all — see the correction below.

This record was filed as one delivery under Decision 016, on the reading that
the two problems shared one acceptance. Reading the Compose topology afterwards
showed they do not: one is a broken build, the other is a capability the starter
never had.

## Severity

Defeito. Nothing in the repository exercises `bun run build:web` followed by
`bun run --filter @fifilo/web start`, so neither problem is caught by a gate.
Not a bloqueador: the Compose image builds and runs by its own path, which this
record does not cover.

## Environment

- Revision reproduced: `2042f8f`.
- macOS 25.5.0, Bun 1.3.14.
- Found while measuring whether `BUG-004`'s remaining cause disappears against
  a production build instead of the Vite dev server.

## Summary

Two independent problems on the same path.

**1. The build depends on `NODE_ENV` being set at build time.** `bun run
build:web` with `NODE_ENV` unset produces a server bundle that calls the
development JSX runtime, and every server render throws:

```
Error reading appStream: TypeError: jsxDEV is not a function
    at RootDocument (apps/web/dist/server/assets/router-DehzNchF.js:580:64)
```

The page still answers `200`, with the error only in the server log — a
deployment would look healthy and serve nothing. Building with
`NODE_ENV=production bun run build:web` produces a bundle that renders.

**2. The standalone server does not reach the API.** With a correct build,
`bun run --filter @fifilo/web start` serves the app, but `/api/...` is not
proxied to `apps/api`:

```
sign-up failed: ...
    at provisionWorkspace (e2e/helpers/workspace.ts:35)
```

The Vite dev server proxies `/api` to `API_PORT`; the production server has no
equivalent, so every request the app makes to its own origin fails.

## Reproduction

```
$ bun run build:web                       # NODE_ENV unset
$ PORT=3100 bun run --filter @fifilo/web start
$ curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/login
200                                       # and `jsxDEV is not a function` in the log

$ NODE_ENV=production bun run build:web
$ NODE_ENV=production PORT=3100 bun run --filter @fifilo/web start
$ curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/login
200                                       # renders, log clean
$ curl -s -X POST http://127.0.0.1:3100/api/auth/sign-up -d '{}'
                                          # not proxied to the API
```

## What the hypotheses turned out to be

**Problem 1, confirmed and fixed.** `.env` carries `NODE_ENV=development`, and
Bun loads `.env` for every `bun run`, so `bun run build:web` inherited it and
`@vitejs/plugin-react` emitted the development JSX runtime. The build script now
pins `NODE_ENV=production` itself, and `scripts/check-web-build.sh` fails when
the server bundle carries `jsxDEV`. That check runs in CI right after
`bun run build` — the job that was already green while producing a bundle that
could not render, because it only checked the build did not error.

**Problem 2, reclassified.** The guess was that Compose puts something in front
of both services. It does not. `docker-compose.yml` runs `bun run dev` for both
`web` and `api`, with bind mounts: **there is no production serving path in this
repository at all**. `apps/web`'s `start` script exists and nothing has ever used
it, and `srvx` has no proxy option.

The browser side is same-origin by design —
`apps/web/src/libs/api-fetch.ts` says so in its own comment, and relies on
Vite's `server.proxy`, which exists only in the dev server. So problem 2 is not
a broken production path; it is the absence of one, together with a `start`
script that reads as if there were.

That is a capability decision, not a bug fix, and the scope rule in `AGENTS.md`
is explicit that a need nobody has is not a reason to build one. The current
consumer that would justify it is the E2E suite (`BUG-004`), which wants a
server that does not compile on demand.

## Closing condition

**Problem 1 — met.** `bun run build:web` produces a bundle that renders, with no
environment variable the script does not set itself, and
`scripts/check-web-build.sh` fails in CI if that regresses.

**Problem 2 — withdrawn from this record.** Serving the app in production is a
capability to decide on, not a defect to close. Whoever takes it decides between
a reverse proxy in front of both services, a custom server entry that forwards
`/api` and `/health`, and dropping the unused `start` script so nothing implies
a path that does not exist.

## Related

- [`docs/bugs/README.md`](README.md) resolves `BUG-NNN` → file → state.
- `BUG-004`: this was found while trying to remove the dev server from the E2E
  suite, which remains blocked on both problems above.
- Decision 016: the decomposition gate, and why this is one issue rather than
  a parent with two children.
