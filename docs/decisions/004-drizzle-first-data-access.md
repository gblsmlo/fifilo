# Decision 004: Drizzle-first data access, raw SQL as a justified exception

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 011; the starter keeps the rule and drops the product-specific evidence.

## Context

A PostgreSQL application that uses Drizzle will still need `sql` for some
things. RLS context, advisory locks, JSONB and lateral joins, CTEs and a few
PostgreSQL functions require or favor SQL expressions. The mix is not the
problem.

The problem is the absence of one operational criterion. Without it, ordinary
business queries get written as full raw SQL while neighboring modules use the
builder. Schema inference is lost, projections need manual casts, and nobody
can tell which exceptions are necessary.

The starter already contains the one sanctioned exception: the workspace
boundary in `packages/infra/database/src/workspace.ts` calls
`tx.execute(sql\`select set_config('app.workspace_id', ...)\`)` to apply RLS
context, then reads it back with `current_setting`. `seed.ts` also uses `sql`
for infrastructure work. Everything a future capability adds should follow the
rule below from the first commit.

## Options considered

1. **Raw SQL everywhere.** Uniform, but every query loses schema inference and
   every projection needs a cast nobody verifies.
2. **Builder everywhere, no exceptions.** Clean types, but RLS, locks and
   set-based transforms become contortions or go untested.
3. **Builder by default, raw SQL only in named classes of exception, each one
   justified locally.**

## Decision

Adopt option 3: Drizzle-first for every adapter in the application.

### Mandatory pattern

- Use `tx.query.*` for relational reads when the `relations()` graph models
  the case correctly.
- Use `tx.select()` for joins, projections, filters, aggregations and shapes
  specific to a use case.
- Use `tx.insert()`, `tx.update()` and `tx.delete()` for ordinary CRUD.
- Use `sql` fragments inside the builder for PostgreSQL-specific aggregates,
  casts, functions or predicates. A fragment must not turn the whole query
  into raw SQL without need.
- The handle is the `WorkspaceTx` delivered by `withWorkspaceTransaction` or
  `withActorWorkspaceTransaction`. It carries the full builder plus `execute`.
  Repositories never receive a SQL-only executor.

### Allowed exceptions for `tx.execute(sql...)`

Full SQL is allowed when the need falls into one of these classes:

1. RLS context: `set_config` and `current_setting`, as `applyWorkspaceContext`
   and `applyActorContext` already do.
2. PostgreSQL concurrency: advisory locks or row locks the builder cannot
   express clearly.
3. CTEs, `LATERAL`, JSONB expansion or set-based transforms the builder does
   not cover adequately.
4. Migrations under `packages/infra/database/drizzle`, `seed.ts`, spikes and
   infrastructure tests.

An exception inside a business module stays in the module that owns the data
and includes:

- a local justification of the builder limitation;
- an explicit intermediate projection type, no wide unverifiable cast;
- a mapper to the Core contract when there is semantic conversion;
- a test that characterizes result, failure, atomicity and isolation.

### Composition and ownership

`repository.ts` remains a composition root only (Decision 003). Choosing
between builder and SQL never authorizes placing a query, mapper or row type
in the composer. Each operation lives in the module that owns the data, the
change cycle and the transactional boundary.

## Consequences

- Ordinary queries keep table and column inference from the Drizzle schema in
  `packages/infra/database/src/schema.ts`.
- Intermediate projections stop depending on wide casts and loose aliases.
- PostgreSQL exceptions remain possible, but each one is identifiable and
  auditable by reading the module.
- Aggregated queries and concurrent operations need integration tests against
  PostgreSQL. Pure unit tests are not enough to declare a data boundary correct.
- Deciding whether an operation really needs raw SQL costs more up front. It
  avoids a second, implicit convention.
- A full raw SQL query in a business module without the four items above is a
  review finding.

## Revisit when

- Drizzle's support for the `pg` driver or for PostgreSQL operations changes
  in a relevant way.
- A recurring class of queries shows the builder cannot serve the domain
  without losing clarity or safety. Then that class becomes a fifth named
  exception here, not a case-by-case allowance.
- The RLS strategy or the transactional boundary is redesigned.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 001 fixes where the cast between transaction handle and RLS
  executor is allowed to live.
- Decision 003 fixes which module owns each operation.
