# Decision 013: Web consumes the API through the executable contract

## Status

Active. Adapted on 2026-09-06 from the reference product's decisions 074 and 075; the starter keeps the rule and drops the product-specific evidence.

## Context

Decision 002 fixed where each boundary validates, not how the consumer reaches
a route. Without a rule, the reference product accumulated dozens of adapters
calling `fetch` with a hard-coded `'/api/...'` literal, status comparisons
written by hand, and a `schema.parse` per adapter that repeated what the route
had validated. Meanwhile every Elysia route declared `response:`, so Eden
treaty could derive the same kernel schemas.

Eden has two mismatches between type and runtime that the consumer must not
absorb one adapter at a time:

- It types declared statuses as string literals (`"403"`) and produces
  numbers at runtime (`403`). `error.status === '403'` compiles and never
  matches.
- It extracts `data` from the fixed `200` slot. On a route that declares only
  `201` or `204`, that slot holds the handler's inferred union, error envelope
  included, so `if (error)` does not narrow `data`. On `204` the runtime
  delivers `""` where the type promises `undefined`.

In the starter the sign-up route in `apps/api/src/features/auth/auth.routes.ts`
declares `201`; `/api/me` in `users.routes.ts` declares `200`.

## Options considered

1. **Keep raw `fetch` with literals** and re-parse in every adapter. Two
   owners for the shape, and paths that drift without a compiler error.
2. **Publish OpenAPI and generate a client.** Right for a non-TypeScript
   consumer; a build step and an artifact for one that can read the type.
3. **Eden treaty over the `App` type**, with the two mismatches isolated in one
   module.

## Decision

Adopt option 3.

### A route is reached through the contract, never through a literal

`apiFetch('/api/...')` in production code is a finding. Consumption is
`api.<resource>`, derived from `App`. The only edge from `apps/web` to
`apps/api` is `import type { App } from '@fifilo/api/server'` in
`apps/web/src/libs/api-client.ts`. It is type-only and erased by
`verbatimModuleSyntax`; `apps/api/package.json` exports only `./server`.

Better Auth traffic is outside this rule: the server handler is a catch-all
`/api/auth/*` with `parse: 'none'`, and the Web talks to it through the Better
Auth client. A catch-all is not typed and should not be.

### `/api` is fixed at treaty construction

The exported client is the `/api` node, not the root:

```ts
export const api = treaty<App>(BASE_SENTINEL, { fetcher }).api
```

Consumption is `api.me.get()` and `api.auth['sign-up'].post(body)`, not
`api.api.me.get()`. Keeping the intermediate node is safe: the Eden proxy is
immutable. The base is a sentinel because the treaty is built at module load,
too early to read the environment; `cookieAwareFetch` in
`apps/web/src/libs/api-fetch.ts` resolves the real destination on every call
and forwards the SSR session cookie.

The `/api` prefix stays on the Elysia routes. Web and API share an origin and
the prefix is how the browser tells API from SPA route.

### Error status goes through `edenStatus`

`edenStatus(error)` returns the status as a number. Comparing `error.status`
directly is a finding; the type does not protect here. `fetchCurrentUser` in
`apps/web/src/features/users/current-user.ts` is the reference: `401` becomes
`CurrentUserUnauthenticatedError`, anything else `CurrentUserLoadError`.

### `edenCreated` translates the routes whose success is not `200`

`edenCreated<T>(result)` normalizes to `{ data } | { error }` for every route
that declares `201` or `204`. It lives next to `edenStatus` in `api-client.ts`
because both isolate the same kind of gap. The name comes from the dominant
case (`201`); the JSDoc states the rule. `signUp` in
`apps/web/src/features/auth/http/sign-up.ts` is the reference. Its `as T` is
the only cast on the path, the price of status not reaching the type.

Routes that declare `200` do not go through it. Wrapping everything would hide
which routes have the problem.

### Routes never change status to please the client

`201` keeps meaning created and `204` no body. Refused: creation routes on
`200`; declaring `200` and `201` together (the `200` never happens, so the
contract lies); waiting for Eden to support `201`.

### The consumer does not re-parse a `200` body

The route already parses with the same kernel schema before responding, so
validation has one owner. A consumer-side `schema.parse` on a typed `200`
response is a finding. The one exception is the `edenCreated` path, where
`data` arrives as `unknown` and `safeParse` restores the type, as `signUp` does.

## Consequences

- One module, `apps/web/src/libs/api-client.ts`, owns the treaty, `edenStatus`
  and `edenCreated`. Adapters in `apps/web/src/features/<capability>/http/`
  import from `@libs/api-client` and translate `{ data, error }` into the
  feature's error classes.
- `api-client.ts` imports `@libs/api-fetch` through the alias so the Storybook
  stub in `apps/storybook/.storybook/main.ts` can replace it (Decision 009).
- `edenCreated` is a compatibility piece, not part of the design. It is deleted
  whole when Eden extracts `data` by the real success status.

## Revisit when

- Eden extracts `data` by the real success status. Delete `edenCreated`; calls
  return to direct consumption.
- Eden returns `undefined` on `204` as the type promises. The runtime note
  above becomes obsolete.
- A route needs a success status other than `200`, `201` or `204`. The
  function's coverage is enumerated, not generic.
- Web `typecheck` grows painful with the full `App` type.
- A non-TypeScript consumer of the API appears. The executable contract stops
  covering the whole boundary and OpenAPI returns to the table.
- A second TypeScript consumer of the API (second app, CLI, typed E2E helper)
  appears: then `apps/web/src/libs/api-client.ts` becomes `packages/api-client`
  exposing `createApiClient({ fetcher })` and `edenStatus`/`edenCreated`, with
  the `fetcher` injected, `api-fetch.ts` staying in Web because it is coupled
  to the TanStack Start SSR request, and the `packages/api-client → apps/api`
  edge recorded here as type-only. Until then one consumer does not justify a
  package.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decisions 001, 002 and 012 in prose: the type-only edge, layered
  validation, and the schemas Eden derives from.
- `apps/web/src/libs/api-client.ts`, the reference shape.
