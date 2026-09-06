<!-- Title: type(scope): short description, e.g. feat(auth): add passkey provider -->

## Summary
- <!-- One sentence: what this PR does and why -->

## Context
- <!-- Problem, user impact, and the technical context that matters -->

## Changes
- <!-- Change 1 -->
- <!-- Change 2 -->

## Boundaries
- [ ] Packages resolve each other only through published `exports`; no import of an internal path.
- [ ] `packages/core` stays free of Elysia, Drizzle, Better Auth and infra packages.
- [ ] A root barrel initializes no runtime: env, database, auth and logger come through explicit subpaths.
- [ ] A component lives where its responsibility says: `ui` primitive, `patterns` composition, `layouts` shell, or the feature.

## Validation
- [ ] `bun run lint:ci`, `bun run typecheck`, `bun run test`
- [ ] `bun run storybook:test` when a component, pattern or story changed
- [ ] `bun run test:e2e` when a route, session or persistence journey changed
- [ ] `bun run build` and `docker compose build` when a Dockerfile, Compose file or runtime package boundary changed
- [ ] Tenant-aware database change: negative coverage with two organizations, `WITH CHECK`, no-context access and rollback

### How to test
1. <!-- Step 1 -->
2. <!-- Step 2 -->

## Decisions
- <!-- New or changed decision under docs/decisions/, cited by number. Delete this section when none. -->

## Screenshot
<!-- Attach when the change is visual. Otherwise delete this section. -->
