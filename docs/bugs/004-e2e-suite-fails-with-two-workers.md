# BUG-004: the E2E suite fails with two workers and passes with one

## State

Partial. Tracked by [gblsmlo/fifilo#2](https://github.com/gblsmlo/fifilo/issues/2).
Cause 1 is fixed; cause 2 is open and is what keeps `workers: 1` pinned.

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

## A second, separate failure mode

After roughly twenty suite runs against the same database, the suite began
failing at `--workers=1` too — `e2e/organizations` could not find a transaction
it had just registered. Recreating the database (`docker compose down -v`,
migrate, bootstrap roles, seed) returned it to 16/16 at one worker.

That one is accumulated fixture data, not concurrency: it reproduced with the
change under test stashed, and disappeared with the data. It is recorded here
because the two are easy to confuse — the same suite, the same command, two
unrelated causes.

The concurrency failure survives a fresh database: 13 passed, 3 failed at the
default worker count immediately after the reset.

## What the investigation found

The original hypothesis — contention rather than data collision — was wrong on
its first half. There are at least two independent causes.

### 1. The specs share one workspace, and one of them asserts totals over it

The `chromium` project injects the seeded owner's session, so `accounts`,
`analytics`, `credit-cards`, `organizations` and `transactions` all act inside
the **same organization**. Their own fixtures are unique per run, which is why
this never looked like collision — but `analytics` does not assert its own
rows. It asserts a workspace-wide aggregate as a delta:

```ts
expect(final.availableCashMinor - baseline.availableCashMinor).toBe(210_000)
```

```
Expected: 210000
Received: 205000
```

The 5.000 difference is R$ 50,00 — exactly the expense `transactions` and
`organizations` each register. A delta is only safe while nothing else writes
between the two reads, and at two workers something does. The comment above
that assertion already explains it is a delta *because* the workspace is
shared; what it did not anticipate was a concurrent writer.

This is a correctness defect in the suite, not slowness: no timeout would fix
it.

### 2. Everything is three to five times slower, and some of it passes a timeout

One Vite dev server and one API process serve both workers. Specs that take 2
to 8 seconds at one worker take 18 to 30 at two, and `credit-cards` exceeded
the 60s test timeout while clicking an option Playwright had already resolved
as "visible, enabled and stable". The 20s `expect` timeout in
`playwright.config.ts` carries a comment from an earlier encounter with the
same wall.

### Ruled out

`PostgresError: Idle timeout reached after 30s` appears in the API log during
failing runs, from `packages/infra/database/src/client.ts`'s `idleTimeout: 30`.
It is **not** a cause: setting `idleTimeout: 0` removed the log line and the
suite still failed three specs, and a probe that bursts queries across the idle
boundary at `idleTimeout: 1` completed 95 queries with zero failures. It is
noise from a connection being reclaimed, not a failed request.

Separately recorded and already known: running `storybook:test` and `test:e2e`
concurrently produces the same class of false failure.

## What landed for cause 1

Each Playwright worker now bootstraps its own workspace — a fresh owner and
organization through the product's own sign-up route, with the session written
to `e2e/.auth/worker-<n>.json` — and `storageState` is a fixture reading that
path rather than a single file named in the config. Row-level security already
scopes every read and write by workspace, so two workers can no longer see each
other's rows at all.

Per worker rather than per spec: specs sharing a worker run serially and cannot
interleave, and one bootstrap per worker keeps the cost flat as the suite grows.

The seeded owner stays for what it is actually good for — `password-sign-in` and
`password-recovery` exercise the login form against a known credential without
writing anything. The `setup` project and `e2e/auth.setup.ts` are gone; nothing
depends on a shared session any more.

Because `storageState` became a fixture, `test.use` can no longer clear it. The
journeys that sign up their own account import `anonymousTest` instead, which
carries the hydration wait and no session.

Evidence: at two workers the wrong-value failure is gone — `analytics` no longer
reports a delta polluted by another spec. What remains at two workers is cause 2
alone, as three plain 60s timeouts waiting for a button to render.

## Closing condition

`bun run test:e2e` passes on a machine with more than one worker, repeatedly,
without retries, and on a database that has already carried many runs — either because the contention is found and removed, or
because the suite declares the isolation it needs (a `workers` setting, a
database per worker, or a serial project) and that declaration is written down
with its reason.

## Related

- [`docs/bugs/README.md`](README.md) resolves `BUG-NNN` → file → state.
- [Decision 008](../decisions/README.md): one runner per test layer.
- [`docs/engineering/test-plan.md`](../engineering/test-plan.md) carries the
  operational detail of the three runners.
