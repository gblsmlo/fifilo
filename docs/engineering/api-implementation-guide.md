# API implementation guide

Implementing a slice in `apps/api`: the responsibility of each layer, the shape
of a route, when to extract a use case, persistence rules and the monorepo
dependencies. The normative sources are Decisions 002, 003, 004 and 005.

## Dependency flow

```text
HTTP request
  -> Elysia route: schema in options, actor context, command
  -> Core use case: rule and Result
  -> Core port
  -> API adapter: Drizzle repository
  -> withWorkspaceTransaction -> PostgreSQL with RLS
  -> route: Result -> HTTP contract
```

## Responsibilities

| Layer | Must | Must not |
| --- | --- | --- |
| Elysia route | declare the schema in `options`, get the context, call the use case, map the response | build a business workflow, touch Drizzle, call auth internals without a boundary, `safeParse` inside the handler |
| Core | commands, rules, use cases, ports, `Result` | import Elysia, Better Auth, Drizzle or `@twincam/infra-database` |
| API adapter | implement ports, map persistence shapes | redefine the contract, put SQL in the composition root |
| `repository.ts` | compose adapter operations | contain SQL, `*Row` types, mappers or persistence rules |
| Infra database | schema, client, workspace transaction, RLS | expose persistence details to Web |

## Composition

`src/app.ts` builds the app and `src/server.ts` only listens. The composition is
exercisable through `app.handle()`, which catches plugin interaction defects no
isolated route reveals; `src/app.test.ts` does exactly that for health and for
the shared validation envelope. The manifest publishes `./server` so Web can
import `type App` for the Eden client, and nothing else.

## Canonical route

```ts
new Elysia({ prefix: '/api/<capability>' }).onError(mapValidationError).post(
  '/action',
  async ({ body, set }) => {
    const result = await useCase(body, dependencies)
    if (isErr(result)) {
      const { body: error, status } = toHttpErrorResponse(result.error)
      set.status = status
      return error
    }
    set.status = 201
    return serialize(result.value)
  },
  {
    body: actionRequestSchema,
    response: { 201: actionResponseSchema, ...errorStatuses },
  },
)
```

- The body, query and params schemas come from `packages/core/src/contracts`
  and are declared in `options`, where Eden and OpenAPI see them. Elysia's
  validation failure becomes the 400 envelope through `mapValidationError`.
- `errorStatuses` in `libs/http-errors.ts` declares the five statuses
  `toHttpErrorResponse` can produce, so the Eden error union is the same across
  modules. A route that can still fail after validation adds
  `internalErrorStatus`.
- The route's status is the contract: a `201` stays `201` and a `204` stays
  `204`. The web client normalizes them (Decision 013).
- A guard may hold the entry authorization, but the use case's permission rule
  stays verifiable in Core. Never `findById` then insert when the port offers an
  idempotent write.

## The auth guard

`createAuthGuard()` in `features/auth/actor-context.ts` is a named `scoped`
plugin: it supplies `actorContext` to the module that mounts it and to nothing
registered later. A module that turns the actor into its own data does so in a
`derive({ as: 'local' })`, so it cannot leak into other modules. The guard
rejects by throwing `ActorRejectionError`, which its own `onError` turns into a
response; returning `status(...)` from a scoped hook would collapse the Eden
error type for every route in scope. `requireActorContext` fails closed when an
adapter receives no actor. The Better Auth handler mounts with `parse: 'none'`
so Elysia's body parser does not consume the stream first.

## When to extract a use case

Extract when the route needs to load context from more than one entity,
evaluate a policy and then write, generate ids, references, audit or
idempotency, be reused by another adapter, or coordinate more than one
repository operation. The use case takes an explicit command and its
dependencies by port.

## Persistence

Every tenant-aware query enters through the workspace transaction. The
organization id comes from the authenticated context, never from client input.
Global auth tables bypass the wrapper. Operations that share an invariant stay
in the same transactional boundary. The Drizzle API choice is
[drizzle-first-persistence.md](drizzle-first-persistence.md).

## Slice README

A slice that grows beyond a route and one adapter gets a `README.md` with the
authorities table, a flow diagram, an index by task and a recipe for adding an
operation, plus its anti-patterns: never split an atomic transaction across
modules, never one file per method, no generic helper bucket, no shared
abstraction without a second concrete need.

## Minimum evidence

Positive and negative tests; authorization and membership; organization
isolation for tenant-aware persistence; idempotency, atomicity and rollback for
a multi-write; `bun run lint:ci`, `bun run typecheck` and the focused tests; a
real environmental blocker declared instead of unrun tests reported green.
