# Decision 005: Elysia route module scope, guard is `scoped`, derives are `local`

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 015; the starter keeps the rule and drops the product-specific evidence.

## Context

The authentication guard supplies `actorContext` through a reusable Elysia
plugin, `createAuthGuard()` in `apps/api/src/features/auth/actor-context.ts`.
Feature modules then derive their own data from it, such as the organization
id or an application-level actor.

Elysia lifecycle hooks have a scope. A `local` hook applies to the instance
that declares it. A `scoped` hook also reaches the parent that mounts it. A
`global` hook reaches everything. When a feature module declares its derive as
`scoped`, the derive leaks into every module registered after it in
`createApp()`. In the reference product a bootstrap route ended up running a
derive from an unrelated module without the guard that module expected, and a
valid composition turned into `500 Authenticated actor context is required.`

A second, quieter problem sits in the same file. A `scoped` derive or
`onBeforeHandle` that can *return* `status(...)` widens the inferred handler
type of every route in that scope. Eden then collapses the `error` type of
those routes to `unknown`, and the `response` map declared per route (Decision
002) stops being the source of the client's error types.

## Options considered

1. **Order the routes so nothing leaks.** Small immediate change, but mount
   order in `app.ts` becomes a hidden and fragile dependency.
2. **Drop the guard's plugin identity.** Avoids deduplication issues, but gives
   up the reusable guard and does not fix feature derives that leak.
3. **Keep the guard reusable and confine feature derives to their module.**
   Preserves the existing composition and makes the lifecycle boundary
   explicit.

## Decision

Adopt option 3.

### Scope rules

- `createAuthGuard()` is a named plugin (`{ name: 'actor-context' }`) whose
  `derive` and `onError` are `as: 'scoped'`. It supplies `actorContext` to the
  route module that mounts it and to nothing registered after that module.
- A derive that turns `actorContext` into module-specific data uses
  `derive({ as: 'local' })`.
- Nothing in a feature module is `global`. Only `createApp()` in
  `apps/api/src/app.ts` owns app-wide hooks, such as the `onError` that maps
  validation errors.
- The validity of the composition never depends on the order of `.use()` calls
  in `app.ts`.
- `requireActorContext` stays fail-closed. A handler that reaches it without
  an actor throws rather than proceeding.

### Rejection is thrown, not returned

- When the resolver rejects, the guard throws `ActorRejectionError`. It does
  not `return status(...)` from the derive.
- The guard's own `scoped` `onError` catches that class, sets `set.status`
  from `error.status` and returns `error.body`, the standard error envelope.
- Throwing keeps the derive's return type clean. Each route's declared
  `response` map remains the only source of its error types, so Eden keeps a
  precise `error` union on the Web side.

### Tests

- Each module tests that its derives do not reach a route of another module.
  `apps/api/src/app.test.ts` drives `app.handle()` across the whole app for
  the same reason: plugin interaction defects only appear in composition.
- `actor-context.test.ts` covers the guard on its own: rejection status, body
  and the absence of leakage.

## Consequences

- `GET /api/me` and any route outside a feature module never receive feature
  context by accident.
- New modules must distinguish shared guard context from data that belongs to
  the module alone. The default for a new derive is `local`.
- The error envelope for an unauthenticated or organization-less request has
  one shape and one owner, the guard's `onError`.
- A future Elysia change to lifecycle semantics requires updating this
  decision and the composition tests together.
- A `scoped` derive in a feature module, or a guard that returns `status(...)`
  from a derive, is a review finding.

## Revisit when

- Elysia changes the semantics of `local`, `scoped` or `global`.
- The guard stops being a reusable plugin.
- The API adopts a central context composition (one module that derives every
  shared value) instead of per-module derives.
- Eden starts preserving per-route error types when a scoped hook returns
  `status(...)`, which would remove the reason to throw.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 002 fixes that the route's `response` map is the contract Eden reads.
- Decision 013 fixes how Web consumes those error types through Eden.
