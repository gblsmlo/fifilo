# Testing

## Goal

Prove behavior, contracts and architectural limits without turning the
documentation into a second test suite. Test evidence belongs to the code, to
CI or to the PR; documents describe the behavior that must be proven.

The operational plan, unit, integration, component and E2E, with setup,
structure and tooling, is [test-plan.md](test-plan.md).

## Strategy

- Domain rules: use-case tests in Core.
- HTTP contracts: request, response and error mapping through `app.handle()`.
- Tenant-aware persistence: positive cases, two organizations, `WITH CHECK`,
  no context and rollback.
- Interface: a story with `play` for what depends on the browser; `bun test`
  for logic without a real DOM; E2E for a journey across routes, session and
  persistence. One behavior, one layer (Decisions 008 and 009).
- Architecture: `exports` maps, tsconfig and per-package boundary tests.

## Repository validation

```sh
sh scripts/check-toolchain.sh
bun run lint:ci
bun run typecheck
bun run test
```

Proportional to the change:

```sh
bun run storybook:test   # a component, pattern or story changed
bun run test:e2e         # a route, session or persistence journey changed
bun run build            # a Dockerfile, Compose file or runtime boundary changed
docker compose build
```

Integration tests need PostgreSQL: `docker compose up -d postgres`,
`bun run db:migrate`. E2E also needs `bun run db:seed`. A failing test whose
cause is the environment is reported as a blocker, not as a green summary.
