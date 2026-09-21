# BUG-004: the E2E suite fails with two workers and passes with one

## State

Open.

## Severity

Defeito. The suite is a gate, and a gate that fails on how many workers the
machine chose reports on the machine, not on the code. CI hides it behind
`retries: 2`, which makes it a slow gate rather than a red one.

## Environment

- Revision reproduced: `647b4f3` and `60bf185` — before and after
  [Fase 06b](../plans/fifilo/fase-06b-ativacao-do-onboarding.md).
- macOS 25.5.0, `@playwright/test` through `bun run test:e2e`, PostgreSQL 17
  from `docker compose`.
- Playwright picks the worker count from the host; this machine gives 2.
  `playwright.config.ts` sets `fullyParallel: false` and does not pin
  `workers`.

## Summary

The same suite, unchanged, passes 16/16 with `--workers=1` and fails with the
default 2. The failing specs vary between runs. Two observed failure shapes:

1. The sign-in never submits. The login page is reached, email and password are
   filled, and `Entrar` stays disabled for the full 20s timeout.
2. A journey's first assertion after a write times out, with the dialog still
   open and its fields empty.

Both were observed in specs that the change under test did not touch, which is
what separates this from a regression.

## Reproduction

```
$ bun run test:e2e
  2 failed
    [chromium] › e2e/analytics/analytics.spec.ts:35:3 › @analytics dashboard › ...
    [chromium] › e2e/auth/organization-onboarding.spec.ts:41:3 › @auth first access ...
  14 passed (32.9s)
```

```
$ bun run test:e2e -- --workers=1
  16 passed (1.1m)
```

Failing specs differ between runs of the same command.

## Hypothesis

Two workers share one PostgreSQL database and one dev server. The suspected
cause is contention rather than data collision: every spec already makes its
fixtures unique per run (`Date.now()`, `crypto.randomUUID()`), and the observed
failures are things not happening in time, not wrong values.

Separately recorded and already known: running `storybook:test` and `test:e2e`
concurrently produces the same class of false failure.

Unverified. Nothing here isolates the dev server from the database, and no
timing evidence was collected.

## Closing condition

`bun run test:e2e` passes on a machine with more than one worker, repeatedly,
without retries — either because the contention is found and removed, or
because the suite declares the isolation it needs (a `workers` setting, a
database per worker, or a serial project) and that declaration is written down
with its reason.

## Related

- [`docs/bugs/README.md`](README.md) resolves `BUG-NNN` → file → state.
- [Decision 008](../decisions/README.md): one runner per test layer.
- [`docs/engineering/test-plan.md`](../engineering/test-plan.md) carries the
  operational detail of the three runners.
