# Decision 002: data flow, and what each layer validates

## Status

Active. Adapted on 2026-09-06 from the reference product's decisions 003 and 023; the starter keeps the rule and drops the product-specific evidence.

## Context

Web, API, domain and persistence must not adopt parallel contracts or validate
the same data with different semantics. The choice touches every module and is
expensive to reverse once public contracts and persisted rows exist.

The starter validates in three places: in the client, at the HTTP boundary and
in the domain. That is deliberate and it is not duplication, but only while
each layer validates a different thing. The criterion is one question:

> What happens if the two layers disagree?

If the disagreement yields a bad experience in a **correct** system, the two
validations have different purposes: defense in depth. If it yields an
**incorrect** system, it is one rule with two owners: debt waiting to diverge.

Repeating *shape* validation is defense. Repeating a *business rule* is debt.
Defense in depth also requires the layers to be chained, one passing through
the other on the request path. Two declarations side by side that never guard
each other are plain duplication, even when they repeat shape.

## Options considered

1. **Reuse persistence schemas in every layer.** One declaration, but the
   table shape leaks into the URL and the Drizzle type becomes the public API.
2. **TypeScript types without runtime validation.** Cheap, but nothing stops a
   malformed request, and Eden and OpenAPI see `unknown`.
3. **Explicit public contracts, rules in Core, internal schemas derived from
   persistence.** More mapping work, but every validation has one owner.

## Decision

Adopt option 3.

### The flow

```text
Web → public Zod contract → HTTP adapter → use case in Core
    → persistence port → Drizzle/PostgreSQL adapter
```

- Public HTTP contracts are explicit Zod schemas in
  `packages/core/src/contracts/` (`auth.ts`, `health.ts`, `users.ts`).
- Types that cross a boundary are inferred from the schema
  (`CurrentUserResponse = z.infer<typeof currentUserResponseSchema>`). No
  parallel interface for the same contract (Decision 012).
- The HTTP adapter validates input and output and converts expected Core
  failures into HTTP responses (`apps/api/src/libs/http-errors.ts`,
  `domain-error-status.ts`).
- Core validates invariants and returns `Result` from `@fifilo/core/result`
  for expected failures.
- Internal persistence schemas derive from Drizzle where applicable. They are
  never public contracts.
- Constraints and RLS protect integrity and tenant isolation, which cannot rest
  on application code alone.
- Web imports public contracts (`@fifilo/core/contracts/users`), never
  `@fifilo/infra-database/schema` or any adapter.

### What each layer validates

| Layer | Validates | If it fails |
| --- | --- | --- |
| client | shape, for feedback before sending; derives what it can | the UX, never correctness |
| HTTP boundary | input shape, declared in the route's `body`, `query`, `params` and `response` | **the type**: without it Eden and OpenAPI see `unknown` or `string` |
| domain | the invariant, what is true about the entity | the data |

None of the three is optional. None replaces another.

### Rules

1. **The boundary validates at the boundary.** A route that takes input
   declares the schema in its options, never inside the handler. `safeParse` in
   the handler body protects the data and loses the type; the contract stops
   existing for the consumer. `GET /api/me` declares `response: { 200:
   currentUserResponseSchema, 401: errorEnvelopeSchema }` for the same reason.
2. **Boundary schemas live in `packages/core/src/contracts/`.** A schema
   declared inline in a route is a contract the client cannot import.
3. **One fact, one owner.** A list of valid values is declared once and
   re-exported. When the boundary needs a variation (a `.catch()`, one extra
   value), it derives from the canonical declaration.
4. **Business rules live in the domain; other layers consult them.** The client
   never rewrites a rule to decide what to offer. It asks the same module the
   server asks. Refusing remains the server's job. In the starter the sign-up
   form consults `password-requirements.ts` for feedback, and Better Auth
   still refuses a weak password on the server.
5. **The client form schema is a UX layer.** `apps/web/src/features/auth/
   schemas/*.ts` may add form-only concerns such as password confirmation. It
   reuses the contract's field rules; it never redeclares an invariant.

## Consequences

- Every validation has a responsible boundary.
- Contract changes are explicit and testable: a route test drives
  `app.handle()` and a Web test imports the same schema.
- There is mapping work between public, domain and database representations.
  That work is the price of one owner per fact.
- Imports enforce part of the boundary: Web has no path to Drizzle because
  `@fifilo/infra-database` is not in `apps/web/package.json`.
- Validation inside a handler is a review finding. If a route truly needs it,
  the reason is recorded here, not solved case by case.

## Revisit when

- Contracts need to be published to external consumers, which raises versioning
  questions this decision does not answer.
- Mapping duplication between layers becomes a measured problem.
- A rule stops being a pure function of its inputs (for example, permissions
  resolved per organization). Then the client cannot consult the module and the
  server must return the resolved decision instead.
- A route needs validation inside the handler and no rule above covers it.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 005 explains why the guard throws instead of returning `status(...)`,
  which keeps the `response` map the single source of a route's error types.
- Decision 012 fixes the Zod-declares, type-infers rule this decision relies on.
- Decision 013 fixes how Web reaches these contracts through Eden.
