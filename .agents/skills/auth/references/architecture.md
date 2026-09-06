---
description: Authentication ownership and dependency boundaries for monorepos.
metadata:
  tags: [architecture, monorepo, dependency-boundaries, authentication]
  source: internal
---

# Architecture and boundaries

## Ownership model

Assign each responsibility to one layer:

| Responsibility | Owner |
| --- | --- |
| Login forms and protected navigation | `apps/web/src/features/auth` and the `(auth)` / `(authenticated)` route groups |
| HTTP status translation | `apps/web/src/features/users/current-user.ts` (Web) and `apps/api/src/features/users` (API) |
| Public current-user shape | `@fifilo/core/contracts/users` (`currentUserResponseSchema`) |
| Session verification | `@fifilo/auth/server` (Better Auth with the organization plugin) |
| Identity persistence and organization scoping | `@fifilo/infra-database` behind the API guard in `apps/api/src/features/auth/actor-context.ts` |
| Business authorization | Core use case plus API enforcement through `requireActorContext` |

Routes coordinate. They must not parse cookies, query the database, or recreate
session policy. Shared auth packages configure session verification. Contracts
must remain runtime-neutral and public.

## Protected-route flow

```text
browser reload
  -> apps/web/src/routes/(authenticated)/route.tsx  (beforeLoad)
  -> loadAuthenticatedRoute in apps/web/src/features/auth/route-guard.ts
  -> fetchCurrentUser in apps/web/src/features/users/current-user.ts
  -> api.me.get() through @libs/api-client, cookie forwarded by cookieAwareFetch
  -> GET /api/me in apps/api/src/features/users/users.routes.ts
  -> @fifilo/auth/server validates the session; the actor context resolves the organization
  -> currentUserResponseSchema (user, organization, role)
  -> route context and protected page inside AppLayout
```

The client must treat the API response as current only for that request. It must
not create a global mutable session cache shared by SSR requests.
`cookieAwareFetch` in `apps/web/src/libs/api-fetch.ts` reads the request from
the TanStack Start context per call and forwards only the `cookie` header.

## Change checklist

For an auth change, inspect:

1. Route guard and redirect helper: `route-guard.ts`, `utils/redirect.ts`.
2. Feature-local HTTP adapters: `features/users/current-user.ts`,
   `features/auth/http/*`.
3. Public Zod contract: `packages/core/src/contracts/{auth,users}.ts`.
4. API session endpoint and the guard: `features/users/users.routes.ts`,
   `features/auth/actor-context.ts`, `features/auth/actor.ts`.
5. Organization and authorization enforcement in the affected use case.
6. Unit and integration tests on both sides of the HTTP boundary:
   `routes/(authenticated)/-route.test.ts`, `features/users/current-user.test.ts`,
   `features/users/users.routes.test.ts`, `features/auth/actor-context.test.ts`.

## Anti-patterns

- Web imports database schemas or session storage clients.
- Core domain imports the concrete auth server.
- API returns complete user rows instead of a public contract.
- A route's broad `catch` treats every failure as unauthenticated.
- Browser storage is used as authority for server session state.
- A raw `fetch('/api/me')` where the Eden client already publishes the route.
