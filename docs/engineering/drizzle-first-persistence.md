# Drizzle-first persistence baseline

This is the single operational source for how persistence is implemented in
the starter. It applies Decision 004 (Drizzle-first) within the boundaries of
Decision 001 and Decision 002; see
[`../decisions/README.md`](../decisions/README.md). This document defines no
product behavior.

The starter ships identity tables only (`users`, `organizations`, `members`,
`invitations`, `notification_outbox` and friends). Examples that touch a
tenant-owned business table use an illustrative `records` table with
`organization_id`; the first real one follows the same shape. The transaction
helper is `withWorkspaceTransaction` from `@fifilo/infra-database/workspace`.
Official references: [select](https://orm.drizzle.team/docs/select),
[insert and upsert](https://orm.drizzle.team/docs/insert),
[update and CTE](https://orm.drizzle.team/docs/update).

## Decision matrix

Choose the API of least power that expresses the whole operation with clarity,
typing and no loss of atomicity.

| Need | Preferred API | Use when | Avoid when |
| --- | --- | --- | --- |
| Relational graph | `tx.query.*` | `relations()` describes the graph and the read needs no special shape or join | the query needs aggregation, a lock, a CTE or a computed projection |
| Projection and joins | `tx.select()` | the use case needs minimal columns, aliases, joins, filters or aggregates | a simple relational read is already expressed by `query.*` |
| Ordinary writes | `tx.insert()`, `tx.update()`, `tx.delete()` | CRUD, upsert, conflict handling and `returning` are covered by the builder | a set-based operation loses atomicity when decomposed |
| PostgreSQL expression | ``sql`...` `` inside the builder | a function, cast, aggregate or predicate has no helper | the fragment starts to contain the whole `SELECT`, `INSERT`, `UPDATE` or `DELETE` |
| Full SQL | `tx.execute(sql...)` | only a documented exception has no equivalent, safe and clear Drizzle form | CRUD, projections, joins, row locks, CTE or update-from, aggregations already covered |

Full SQL at runtime is a documented exception with an owner, a justification
and a proportional test. The exception list lives in the persistence module's
README and is reviewed with the module. The rule holds by review and by the
package `exports` map of `@fifilo/infra-database`, which exposes the
transaction helpers and the schema, not a raw SQL executor.

## Reads

### Relational graph

Use `query.*` when the relations declared in the schema match the result:

```ts
const membership = await tx.query.members.findFirst({
  columns: { id: true, role: true },
  where: and(eq(members.organizationId, organizationId), eq(members.userId, userId)),
  with: {
    user: { columns: { id: true, email: true } },
  },
})
```

The organization filter stays explicit as defense in depth, even with RLS
active.

### Partial projection and optional filters

`and()` ignores `undefined` conditions. Do not build SQL strings or use sentinel
values for absent filters:

```ts
const rows = await tx
  .select({
    id: records.id,
    title: records.title,
    ownerUserId: records.ownerUserId,
  })
  .from(records)
  .where(
    and(
      eq(records.organizationId, input.organizationId),
      input.ownerUserId ? eq(records.ownerUserId, input.ownerUserId) : undefined,
      input.createdFrom ? gte(records.createdAt, input.createdFrom) : undefined,
    ),
  )
  .orderBy(asc(records.id))
  .limit(input.limit)
```

Select only the columns the caller consumes. For collections, prefer joins or a
batched relational read over one query per item.

## Writes

### Insert and `returning()`

```ts
const [record] = await tx
  .insert(records)
  .values({ id: recordId, organizationId, title })
  .returning({ id: records.id, title: records.title })
```

`returning()` is the way to read back generated values. Never insert and then
select the row again.

### Partial update

An `undefined` property is omitted by the builder. Use that to preserve the
current value; do not confuse `undefined` with `null`, which writes `NULL`:

```ts
await tx
  .update(records)
  .set({
    ownerUserId: input.ownerUserId,
    status: input.status,
    updatedAt: sql`now()`,
  })
  .where(and(eq(records.organizationId, input.organizationId), eq(records.id, input.recordId)))
```

### Canonical upsert

Declare the constraint target and return the persisted row, including on the
conflict path:

```ts
const [setting] = await tx
  .insert(organizationSettings)
  .values({ id: settingId, organizationId, key, value })
  .onConflictDoUpdate({
    target: [organizationSettings.organizationId, organizationSettings.key],
    set: { value, updatedAt: sql`now()` },
  })
  .returning({ id: organizationSettings.id, key: organizationSettings.key, value: organizationSettings.value })
```

Use `onConflictDoNothing()` only when ignoring the duplicate is part of the
idempotent contract.

### Constraint violations

Handle expected constraint violations at the persistence boundary and convert
them to a `Result` from `@fifilo/core/result`, which the route maps to the
planned HTTP status. Never expose the PostgreSQL message, the constraint name
or the row as a contract.

## Transactions and tenant isolation

Every operation on a tenant-aware table goes through the workspace transaction:

```ts
return withWorkspaceTransaction(input.organizationId, async (tx) => {
  const [record] = await tx
    .select({ id: records.id })
    .from(records)
    .where(and(eq(records.organizationId, input.organizationId), eq(records.id, input.recordId)))
    .for('update')

  if (!record) return null

  await tx
    .update(records)
    .set({ updatedAt: sql`now()` })
    .where(and(eq(records.organizationId, input.organizationId), eq(records.id, record.id)))

  return record.id
})
```

The helper runs `set_config('app.workspace_id', <id>, true)` inside the
transaction and verifies it was applied. RLS is the mandatory boundary; the
explicit `organizationId` filter is additional defense and states the invariant
in code. Tenant-aware changes need negative coverage with two organizations,
`WITH CHECK`, access without context and rollback. Runtime roles receive only
the privileges they need.

Keep transactions short: run pure validation before opening one, and never
perform HTTP calls, external queue work or prolonged CPU work while locks are
held.

## Concurrency

### `FOR UPDATE` and `SKIP LOCKED`

Row locks are part of the builder and never justify full SQL on their own:

```ts
const candidates = await tx
  .select({ id: notificationOutbox.id })
  .from(notificationOutbox)
  .where(eq(notificationOutbox.status, 'pending'))
  .orderBy(asc(notificationOutbox.availableAt))
  .limit(batchSize)
  .for('update', { skipLocked: true })
```

### CTE with `UPDATE FROM`

Drizzle covers an atomic claim with a CTE. Do not split selection and update
into two concurrent operations:

```ts
const candidates = tx.$with('candidates').as(
  tx
    .select({ id: notificationOutbox.id })
    .from(notificationOutbox)
    .where(eq(notificationOutbox.status, 'pending'))
    .orderBy(asc(notificationOutbox.availableAt))
    .limit(batchSize)
    .for('update', { skipLocked: true }),
)

const claimed = await tx
  .with(candidates)
  .update(notificationOutbox)
  .set({
    status: 'processing',
    attempts: sql`${notificationOutbox.attempts} + 1`,
    updatedAt: sql`now()`,
  })
  .from(candidates)
  .where(eq(notificationOutbox.id, candidates.id))
  .returning({ id: notificationOutbox.id, attempts: notificationOutbox.attempts })
```

### Advisory locks

Use an advisory lock as full SQL only when the invariant depends on a logical
key with no suitable row to lock. The documented exception explains the key,
the acquisition order and the rollback behavior. A `UPDATE FROM VALUES`
reshuffle may also remain full SQL when the builder cannot represent the typed
set without decomposing the operation.

## Aggregations and PostgreSQL functions

Keep the structure in the builder and limit `sql` to the specific expression.
Always parametrize values through Drizzle template interpolation:

```ts
const queue = await tx
  .select({
    status: notificationOutbox.status,
    total: count(),
    oldestAvailableAt: min(notificationOutbox.availableAt),
    retryable: sql<number>`count(*) filter (where ${notificationOutbox.attempts} > ${0})`,
  })
  .from(notificationOutbox)
  .groupBy(notificationOutbox.status)
  .orderBy(asc(notificationOutbox.status))
```

Never use `sql.raw()` with external input and never concatenate identifiers,
filters or values. If a dynamic identifier is unavoidable (a sortable column,
for example), restrict it to a closed list owned by the application and map
the request value onto a schema column object, not onto a string.

## Drizzle rows and Core types

Rows and projections are internal types. HTTP contracts stay explicit in
`packages/core/src/contracts`; internal schemas may be derived with
`drizzle-zod`. Do the semantic conversion in one cohesive mapper:

```ts
const recordSummarySelect = {
  id: records.id,
  title: records.title,
  createdAt: records.createdAt,
} as const

type RecordSummaryRow = Awaited<ReturnType<typeof selectRecordSummary>>[number]

const mapRecordSummary = (row: RecordSummaryRow): RecordSummary => ({
  id: row.id as EntityId,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
})
```

Infer the type from the real projection. Do not replicate `snake_case`
aliases, do not cast the whole response, and never return a Drizzle row as a
public contract. Ids cross the boundary as opaque strings (Decision 014).

## Security checklist

- Use the workspace transaction for every tenant-aware table.
- Parametrize values with Drizzle helpers or `sql` templates; never
  concatenate external input.
- Keep the explicit organization filter as defense in depth.
- Test RLS, `WITH CHECK`, rollback, no-context access and two tenants.
- Least privilege for runtime and migration roles.
- No rows, constraint names or database messages in the HTTP contract.
- Classify constraints and expected failures at the persistence boundary.
- Preserve lock order and idempotency; test concurrency on real PostgreSQL.

## Performance

- Project only consumed columns and limit collections.
- Avoid N+1 with relations or batched joins.
- Align indexes with observed filters, joins and ordering. An index migration
  needs separate evidence and is not part of a syntactic schema migration.
- Prefer set-based operations when they preserve clarity and atomicity.
- Keep transactions short; no external I/O under lock.
- Prepared statements only after evidence of a repeated query and a measurable
  gain; the driver already handles the common path.
- Run `EXPLAIN (ANALYZE, BUFFERS)` and read production metrics before
  optimizing. Compare cardinality, plan, latency and contention before and
  after.

## Maintaining the exception list

Adding a full SQL statement at runtime means adding an entry to the persistence
module's README with owner, category (`concurrency`, `rls-context`,
`set-based`, `jsonb-lateral`), justification and the test that covers it.
Migrating an exception back to the builder removes the entry in the same PR.
The `set_config` and `current_setting` calls in
`packages/infra/database/src/workspace.ts` are the starter's only exceptions.
