# BUG-005: the production web build does not render, and cannot serve the API path

## State

Open. Tracked by [gblsmlo/fifilo#3](https://github.com/gblsmlo/fifilo/issues/3),
which counts the two problems below as one delivery under Decision 016: they
share one acceptance, and fixing either alone leaves the path broken.

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

## Hypothesis

The build reads `NODE_ENV` rather than Vite's own `mode`, so a build invoked
without it falls back to development. The missing proxy is a deployment-shape
question: Compose puts something in front of both services, and the standalone
`start` script was never the path anything exercised.

Unverified. Neither the Vite config nor the Compose topology was read while
recording this.

## Closing condition

`bun run build:web` followed by `bun run --filter @fifilo/web start` serves a
rendered page whose own `/api` calls succeed, without any environment variable
the script does not set itself — and something in CI exercises that path, so it
cannot rot again.

## Related

- [`docs/bugs/README.md`](README.md) resolves `BUG-NNN` → file → state.
- `BUG-004`: this was found while trying to remove the dev server from the E2E
  suite, which remains blocked on both problems above.
- Decision 016: the decomposition gate, and why this is one issue rather than
  a parent with two children.
