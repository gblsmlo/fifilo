# Feature delivery flow

The execution order of one vertical slice across Core, API and Web. Each phase
ends in executable evidence; none is skipped for speed. A sub-issue is born as
a vertical delivery, and the phases are the work order inside it. Split into
separate issues only when there is a distinct lifecycle, acceptance, evidence,
dependency or review cycle (Decision 016).

## 1. Modeling

- Types, commands, rules, use cases and ports in `packages/core/src/<capability>`
  with `Result` for expected failures.
- The public HTTP contract explicitly in `packages/core/src/contracts` when more
  than one capability or app consumes it, otherwise in the capability's
  `schemas.ts` (Decision 012). Zod declares; the type infers.
- Internal persistence schemas derived from Drizzle and mapped at the API
  boundary. Confirm authorization, tenant, transaction, idempotency and rollback.

Evidence: contracts and use cases exist, with no SQL and no transport.

## 2. Tests before transport

- Use-case success, expected failures and invariants.
- Contract request, response and error mapping.
- Tenant-aware persistence: two organizations, negative access, `WITH CHECK`,
  no context, rollback.
- Minimal failing test, minimal implementation, then negative and recovery cases.

## 3. Routes

- A thin route in `apps/api/src/features/<capability>`, schema in `options`,
  registered in `app.ts` and in the OpenAPI tags.
- Adapter access to Drizzle through the workspace transaction; never raw SQL in
  the composition root.

## 4. Documented client

- The contract appears in the OpenAPI reference served in development.
- The typed client in `apps/web/src/features/<feature>/http/` reaches the route
  through `api.<resource>` from `@libs/api-client`, never through a literal
  path (Decision 013). The client never imports Drizzle or persistence details.

## 5. Web

- A thin route file; behavior in `apps/web/src/features/<feature>/` in the
  shape of Decision 007. `apps/web/src/features/auth` is the model:

```text
index.ts              public API of the feature (what routes import)
route-search.ts       Zod contract of the URL (when the route has search)
query-options.ts      shared query options (when loader and hooks share a resource)
<domain>.ts           pure domain modules at the root
http/                 HTTP adapters
hooks/                feature-only hooks
pages/                route wiring and page compositions
components/           visual blocks with no router knowledge
  forms/              form containers and their *FormFields surfaces
  dialogs/            feature dialogs over the Patterns shells
  <clear group>/      only when 2+ pieces of the same family exist
schemas/              form schemas
utils/
storybook/            fixtures consumed by stories, outside the production tree
```

- Server state in TanStack Query, form state in React Hook Form, URL state in
  TanStack Router, Zustand only for ephemeral UI state.
- A form publishes two surfaces: the container that calls the hook and owns
  network, navigation and toast, and the `*FormFields` presentational surface
  that validates by schema and delegates to `onSubmit`. Stories mount the
  second.
- Functionality defines the feature; the data it reads does not. A feature
  imports another only through its public path. Never create an empty or
  speculative folder.

## 6. Stories and journeys

- Every published primitive or pattern the slice added has a story; every
  feature surface with browser-dependent behavior has a story with `play`
  (Decision 009).
- A journey across routes, session and persistence gets an E2E spec.

## Minimum evidence

The API guide's list, plus a coherent OpenAPI document when a route or contract
changed, `bun run storybook:test` when a component changed, and a screenshot or
recording for a visual change.

## Recommended commit slices

1. `feat(core): add <capability> contracts and use cases`
2. `feat(database): persist tenant-owned <capability> data`
3. `feat(api): expose <capability> endpoints`
4. `feat(web): add <capability> user journey`
5. `test(<capability>): add cross-tenant and browser evidence`

Never mix the first business domain into auth tables, session resolution or
neutral primitives. If a slice cannot be reverted without breaking identity or
organization onboarding, review its boundary before merging.
