# Decision 028: an analytics projection is a Core use case; no analytical query is born in the route or the Web

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 05](../plans/fifilo/fase-05-analytics-e-graficos.md).

## Context

Fase 05 § Objetivo names the real stakes ahead of any chart: "toda projeção
construída aqui vira, sem reescrita, uma ferramenta de agente na Fase 08" -
an agent that calls a tested projection inherits its authorization, its RLS
and its correctness for free; an agent (or a route, or a Web hook) that
writes its own SQL against `entries`/`transactions` inherits none of it, and
repeats Fase 05 § Riscos' two named mistakes (a transfer counted as a
movement, a sum done in application code instead of Postgres) at every call
site that skipped the shared function.

## Options considered

1. **The route queries the database directly** and shapes the response
   inline. Fastest to write once, but the transfer-exclusion rule and the
   date-range guard then live in as many route handlers as there are
   projections, and a Fase 08 agent tool wrapping the same data re-derives
   both from scratch - exactly the risk Fase 05 § Objetivo calls out.
2. **The Web feature composes several smaller API calls into a chart's
   shape** (e.g., fetch raw transactions, group client-side). Repeats the
   "somar na aplicação" mistake Fase 05 § Riscos names by name, at the one
   layer (the browser) least able to do it correctly at scale.
3. **Each projection is a Core use case** —
   `packages/core/src/analytics/use-cases/*.ts` — taking an explicit period
   and organization, calling a narrow `AnalyticsReader` port for the one
   aggregate it needs, with the shared `validateDateRange` guard as its first
   statement. The route becomes a thin adapter: parse the query with the
   matching Zod schema (`packages/core/src/analytics/schemas.ts`, Decision
   002), call the use case, map its `Result` to HTTP.

## Decision

Adopt option 3.

### The period is always an explicit civil range, never "today"

Every projection's query carries `from`/`to` as civil date strings (Decision
018); the domain never calls a clock. `validateDateRange` runs before the
reader is ever called, so an inverted range fails the same way in a unit
test as it does behind a real request - no route, session or browser needed
to exercise the failure path (the same argument Decision 026 makes for role
checks).

### The reader aggregates; the use case never sums

`AnalyticsReader`'s six methods (`packages/core/src/analytics/ports.ts`)
return an already-aggregated shape - a monthly point, a category share, a
running balance - never a row per transaction for the use case to reduce.
The Postgres implementation
(`apps/api/src/features/analytics/analytics-persistence.ts`) does the sum
with a `group by` or a `sum(...) over (order by ...)` window function inside
`withWorkspaceTransaction`, so RLS still filters every row before the
aggregate ever runs.

### A transfer is excluded at the query, not after

`monthlyCashflow` and `spendByCategory` join `transactions` and filter its
`kind`, rather than trusting the caller to have excluded transfers upstream -
the same fact Decision 023 already guarantees (a transfer's `categoryId` is
always null), read here from the side that is cheapest to index and hardest
to forget.

## Consequences

- `apps/api/src/features/analytics/analytics.routes.ts` has no `where`
  clause and no `group by` of its own - every route is
  `parse → call the use case → map the Result`, identical in shape to every
  other feature's routes (Decision 003).
- A future Fase 08 tool calls `getMonthlyCashflow` (or any of the other five)
  directly, with the same `AnalyticsReader` the route already wires - it
  inherits the transfer exclusion, the date-range guard and RLS without
  writing a line of SQL.
- Every response carries `Cache-Control: private, max-age=0, must-revalidate`
  and an `ETag` (Fase 05 § API): the use case's output is one workspace's own
  financial data, never eligible for a shared cache regardless of which
  layer computed it.
- The integration suite
  (`apps/api/src/features/analytics/analytics-persistence.integration.test.ts`)
  proves the two Fase 05 § Riscos mistakes against real PostgreSQL, not a
  fake: a transfer never inflates `monthlyCashflow` or `spendByCategory`, and
  an installment counts at its own transaction's `occurredOn`.

## Revisit when

- Fase 08 needs a projection these six do not cover (a forecast, a
  comparison against a prior period) - Fase 05 § Escopo already excludes
  both from this phase; a new one is a new Core use case behind the same
  `AnalyticsReader` shape, not a bespoke query.
- A projection's `group by` no longer holds at scale and needs a materialized
  view (Fase 05 § Persistência already anticipates this, gated on an attached
  `EXPLAIN ANALYZE` and its own migration) - the use case's contract does not
  change, only what sits behind `AnalyticsReader`.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 002: validation in the route's Zod schema, never `safeParse` in
  the handler - `analytics.routes.ts` follows it for all six query shapes.
- Decision 003: `repository.ts` is a composition root; `analytics-persistence.ts`
  carries every query, `repository.ts` only wires it to the port.
- Decision 018: the financial fact is a civil date - the reason a period is
  two strings, never a `Date` or a server-side "today."
- Decision 023: a transfer has no category - the fact `notTransfer`'s query
  filter reads from the cheaper side.
- Decision 027: the chart library a projection's result eventually reaches,
  once the Web feature shapes it for `TrendLineChart` or `RankedBarChart`.
