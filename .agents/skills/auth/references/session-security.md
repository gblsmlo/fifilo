---
description: Cookie-session bootstrap, error classification, and security controls.
metadata:
  tags: [session, cookies, SSR, security, redirects, authorization]
  source: internal
---

# Session and security patterns

## Typed outcomes

Model the bootstrap outcomes explicitly, as
`apps/web/src/features/users/current-user.ts` does:

```ts
class CurrentUserUnauthenticatedError extends Error {}
class CurrentUserLoadError extends Error {}

const { data, error } = await api.me.get()

if (error) {
  if (edenStatus(error) === 401) throw new CurrentUserUnauthenticatedError()
  throw new CurrentUserLoadError(edenStatus(error))
}
return data
```

The protected route redirects only when it receives
`CurrentUserUnauthenticatedError`. Preserve all other failures so operational
monitoring and users see the correct state. Status comparison goes through
`edenStatus`: Eden types declared statuses as string literals and produces
numbers at runtime.

## Cookie forwarding in SSR

Forward the original `Cookie` header for the current request only when the
server-side fetch does not automatically preserve it. `cookieAwareFetch` in
`apps/web/src/libs/api-fetch.ts` does exactly this and nothing more. Do not
forward arbitrary request headers, particularly authorization, origin, internal
proxy, or response headers, unless the endpoint requires and validates them.

Use same-origin session endpoints whenever possible: in the browser the path
stays relative and the Vite proxy routes `/api` to the API. Cross-origin
credentialed requests require strict allow-listed origins, explicit CORS
credentials support, and additional CSRF analysis.

## Redirect safety

Store only a normalized relative pathname, query, and hash. Reject schemes such
as `https:`, protocol-relative values, and malformed external URLs. After login,
redirect to the validated internal path or a fixed default.
`encodeAuthRedirect` and `decodeAuthRedirect` in
`apps/web/src/features/auth/utils/redirect.ts` own this normalization.

## Authorization is not authentication

A session proves identity. Every API operation still needs resource and
organization authorization. Do not infer organization, role, or resource
ownership from client input. Resolve the actor context from the validated
session (`createAuthGuard` in `apps/api/src/features/auth/actor-context.ts`)
and verify it at the use-case or data-access boundary; `requireActorContext`
fails closed when an adapter receives no actor.

## Observability

Log security-relevant events with safe metadata:

- outcome category (`unauthenticated`, `forbidden`, `bootstrap_failure`)
- request correlation ID
- route or operation name

Never log cookies, tokens, authorization headers, passwords, MFA challenges,
or full PII payloads.
