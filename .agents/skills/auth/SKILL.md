---
name: auth
description: Use when implementing, maintaining, reviewing, or debugging authentication and session flows across monorepo applications and shared packages.
scope: twincam
compatibility: TypeScript monorepos with server-validated cookie sessions, including React SSR clients and HTTP APIs.
metadata:
  category: discipline
  triggers: authentication, authorization, session, cookie, login, protected route, refresh, reload, monorepo auth
  author: twincam
  version: 1.0.0
---

# auth

Use this skill for authentication changes spanning application routes, HTTP
adapters, shared contracts, auth packages, and infrastructure packages.

## Start with the monorepo boundary map

Before changing auth behavior:

1. Identify the application that owns the route or API endpoint.
2. Identify the shared package that configures authentication.
3. Identify the public contract consumed across the client/server boundary.
4. Identify the persistence and tenant boundary, without importing it into
   client or domain packages.
5. Read local agent instructions and inspect existing auth tests before coding.

Keep dependencies directional:

| Layer | May depend on | Must not depend on |
| --- | --- | --- |
| Web route/feature (`apps/web/src/routes/(auth)`, `apps/web/src/routes/(authenticated)`, `apps/web/src/features/auth`, `apps/web/src/features/users/current-user.ts`) | `@twincam/core/contracts/*`, `@twincam/auth/client`, `@libs/api-client` | `@twincam/infra-database`, `@twincam/auth/server` |
| API adapter (`apps/api/src/features/auth`, `apps/api/src/features/users`) | `@twincam/auth/server`, use cases, `@twincam/core/contracts/*` | client-only modules (`@twincam/auth/client`, `apps/web`) |
| Core/domain (`packages/core`) | `@twincam/core/primitives`, public contracts | `@twincam/auth/server`, `@twincam/infra-database` |
| Auth package (`packages/auth`) | `@twincam/infra-env/server`, `@twincam/infra-database` adapters, Better Auth with the organization plugin | `apps/web` features |
| Infrastructure (`packages/infra/*`) | configuration and persistence | `apps/*` |

## Session bootstrap

For each protected navigation, derive identity from a server-validated session.

1. The web route invokes one feature-local current-user adapter.
2. SSR forwards only the original request cookie to the same-origin session
   endpoint. Do not retain request headers globally.
3. The API reads the incoming request headers through the auth server and
   returns a minimal, validated public user contract.
4. The route receives an authenticated result and sets route context.

Do not restore identity from `localStorage`, cached profile data, a client JWT,
or a previous React state after a full reload.

## Error classification

Treat authentication absence as an explicit, typed expected failure.

| Outcome | Route behavior |
| --- | --- |
| `401` session absent or invalid | Redirect to login with a normalized internal return path |
| `403` authenticated but unauthorized | Render or throw an authorization outcome, never login |
| network, timeout, `5xx` | Preserve a technical error, do not log out |
| malformed successful payload | Preserve a contract error, do not log out |

Avoid catch-all route guards that transform every failure into a login redirect.
They convert outages and deployment faults into misleading authentication
failures.

## Security requirements

- Keep session credentials in `HttpOnly`, `Secure` production cookies.
- Choose `SameSite=Lax` or stricter unless a documented cross-site flow needs
  another policy.
- Validate session state on the server for each protected bootstrap.
- Send `credentials: 'include'` only for intended same-origin auth calls.
- Never place session identifiers, bearer tokens, passwords, or MFA codes in
  URLs, browser storage, analytics, errors, or logs.
- Normalize login redirects to application-relative paths and reject external
  schemes to prevent open redirects.
- Enforce authorization at the API/use-case boundary, independently of route
  guards.
- Scope tenant identity from the validated session, not from client-provided
  headers, query strings, or request bodies.

## Delivery workflow

1. Trace browser, SSR, API, auth package, and persistence interactions.
2. Write a failing regression test for the observed session behavior.
3. Add the smallest typed error/result boundary that distinguishes expected
   auth absence from technical failures.
4. Keep route files thin and place HTTP/session adapters in the owning feature.
5. Add API coverage for session-present and session-absent responses.
6. Run focused tests, then repository lint and type checks.

## Required regression cases

- Valid authenticated session survives a full protected-route reload.
- Session bootstrap returns the current public user.
- Missing or invalid session redirects only to login and retains a safe return
  path.
- `403` never masquerades as logout.
- `5xx`, network failures, and invalid API payloads do not redirect to login.
- SSR request cookies reach the session bootstrap endpoint without leaking
  state across requests.

## References

- [Architecture and boundaries](references/architecture.md)
- [Session and security patterns](references/session-security.md)
- [External standards](references/standards.md)
