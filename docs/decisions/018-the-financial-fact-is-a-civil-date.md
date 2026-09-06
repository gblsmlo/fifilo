# Decision 018: the financial fact is a civil date

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 00](../plans/fifilo/fase-00-fundacao-do-produto.md).

## Context

The reference implementation of this domain — Financy, the same product on a
different stack — shipped a dashboard whose month boundary was computed in UTC.
Every transaction recorded in the last three hours of any month in `America/Sao_Paulo`
counted toward the following month. The report was wrong, plausible, and
nobody noticed until an audit.

The instinct is to call that a timezone conversion bug and fix the conversion.
That reading is wrong and produces the same defect again somewhere else. The
actual mistake is upstream: a purchase was modeled as an instant when it is
not one.

A purchase happened on a day. The user knows the day, writes the day, filters
by the day and expects a report by month of that day. What time it was is not
a fact of the domain — it is not collected, not shown and not used. Storing an
instant means inventing a value the domain never had, and then every read has
to guess its way back to the value the user actually meant.

Nothing in the repository has taken a position on this yet: the schema in
`packages/infra/database/src/schema.ts` uses `timestamptz` throughout, but
every column there is a system fact (`created_at`, `expires_at`), not a
business date.

## Options considered

1. **`timestamptz` and convert on read.** Store the instant, apply
   `at time zone` in every query and in the Web. Correct where applied and
   wrong wherever someone forgets. Every aggregate, every filter and every test
   becomes a place that must remember, and there is no gate that catches an
   omission.
2. **`timestamptz` normalized to workspace midnight on write.** Removes the
   per-query conversion, but bakes the workspace timezone into stored data.
   Changing the workspace timezone silently reinterprets the entire history.
3. **`date` for the domain fact.** The timezone exists only where a human
   notion like "today" or "this month" is resolved into civil dates, at the
   edge, before the domain is called.

## Decision

Adopt option 3.

### The column

`occurred_on date not null` on transactions and entries. The contract declares
it as an ISO calendar date string (`z.iso.date()`), never a datetime.

`created_at` and `updated_at` stay `timestamptz`. They are facts of the system,
they carry an instant, and they are not part of any financial report.

### Aggregation carries no conversion

```sql
date_trunc('month', occurred_on)
```

There is no `at time zone` in an analytics query, because there is nothing to
convert. This is the property being bought.

### The domain never reads a clock

A use case receives a period as two civil dates. It does not call `now()`, and
it does not know what "this month" means. Resolving "this month" is the Web's
job, using the workspace timezone and `monthStartDay` from the settings of
[Fase 06](../plans/fifilo/fase-06-settings-e-aceitacao.md).

### `new Date(occurredOn)` is a finding

Passing a `YYYY-MM-DD` string to the `Date` constructor produces an instant at
UTC midnight. The first `getMonth()` on it in a negative offset returns the
previous month, which is the original defect, rebuilt inside Core. Arithmetic
on civil dates uses civil-date functions that never materialize an instant.

### Ordering inside a day

A date has no intra-day order, so lists sort by `(occurred_on, id)`. The cursor
pagination of [Fase 02](../plans/fifilo/fase-02-categorias-e-transacoes.md) uses
the same pair, so the tiebreaker is not an extra mechanism.

## Consequences

- An entire class of defect stops being possible rather than being tested for.
- Tests do not depend on the runner's timezone, and CI does not need `TZ` set
  to be trustworthy.
- The workspace timezone can change without reinterpreting stored history.
- A future capability that genuinely needs the instant of an event — a bank
  sync reporting authoritative timestamps — adds its own `timestamptz` column
  next to `occurred_on`. It does not change the meaning of `occurred_on`.
- A transaction dated in the future is representable and legitimate; listings
  separate settled from scheduled instead of the storage type forbidding it.

## Revisit when

- A capability needs true sub-day ordering of financial facts by real instant.
- Bank synchronization arrives and the product decides to display provider
  timestamps alongside the civil date.
- A jurisdiction requires an auditable instant of record for a transaction.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 012: the date format is declared in the contract, and the type is
  inferred from it.
- Decision 017: the other primitive that had to be fixed before the first
  business table.
