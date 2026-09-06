# Operation: idempotency, migrations and rollout

Execution invariants that cut across capabilities. They apply to the first
business capability as much as to Auth, and the persistence side of each rule
follows [`drizzle-first-persistence.md`](drizzle-first-persistence.md). The
adapter and layering premises are Decision 003 and Decision 004, indexed in
[`../decisions/README.md`](../decisions/README.md).

## Idempotency and concurrency

### Webhook inbox with deduplication

Every inbound webhook lands first in an inbox table, not in the business
tables. The inbox row carries the provider id, the event id the provider
assigns, the raw payload and a processing status.

- A unique constraint on `(provider, external_event_id)` is the deduplication.
  A redelivered event hits the constraint and is acknowledged without a second
  side effect.
- The HTTP handler only writes the inbox row and returns `2xx`. Processing runs
  afterwards from the inbox, so a slow business rule never makes the provider
  retry.
- Raw payloads are Level 3 or Level 4 data and follow the 30-day retention row
  in [`security.md`](security.md).

### `idempotency_key` on commands

Commands that send, charge, publish or otherwise cause an external effect
accept an `idempotency_key`. The key is chosen by the caller and stored with
the command result.

- The same key returns the stored result; it never re-executes the effect.
- The key is scoped by organization. Two tenants may use the same string.
- Idempotency records follow the 90-day retention row.
- The key is part of the contract in `packages/core/src/contracts`, not an
  implementation detail of the route.

### Optimistic locking

Rows edited by more than one actor carry a `version` column. An update sends
the version it read, and the `where` includes it:

```ts
const [updated] = await tx
  .update(records)
  .set({ title: input.title, version: sql`${records.version} + 1`, updatedAt: sql`now()` })
  .where(
    and(
      eq(records.organizationId, organizationId),
      eq(records.id, input.id),
      eq(records.version, input.expectedVersion),
    ),
  )
  .returning({ id: records.id, version: records.version })
```

No row returned means someone else won. The use case returns a conflict
`Result`; the route maps it to `409`. The client reloads and decides. The same
conditional update shape is how assignment and claim operations stay atomic:
one statement, never a read followed by a write.

### Transactional outbox

Events that trigger jobs are written in the same transaction as the business
change. The starter ships `notification_outbox` in
`packages/infra/database/src/schema.ts` for auth and invitation emails; the
first capability that needs asynchronous effects follows the same shape:

| Column | Role |
| --- | --- |
| `id` | opaque id (Decision 014) |
| `event_type` | closed list owned by the producer |
| `status` | `pending`, `processing`, `sent`, `failed` |
| `payload` | `jsonb`, references only, never full sensitive records |
| `attempts`, `last_error` | retry bookkeeping |
| `available_at`, `processed_at` | scheduling and completion |

Rules:

- the business row and its outbox row are created in one transaction; a
  rollback removes both;
- a worker claims rows with `FOR UPDATE SKIP LOCKED` and moves them to
  `processing` in the same statement;
- delivery is at-least-once, so consumers are idempotent;
- a row that exhausts attempts becomes `failed` and shows up in the internal
  panel; it is never deleted silently.

### Ordering

When the provider guarantees order per stream, keep it. When it does not,
order by `occurred_at` plus a local sequence assigned on receipt. Never rewrite
the original event to make it fit; store the correction as a new event.

## Migrations and rollout

- Migrations are forward-only and each step is compatible with the code
  version running before and after it. There is no down migration in
  production.
- Destructive changes follow expand/contract: add the new column or table,
  dual-write, backfill, switch reads, then remove the old shape in a later
  release once nothing reads it.
- `drizzle-kit push` (`bun run db:push`) is for local development only.
  Staging and production apply versioned, reviewed migrations from
  `packages/infra/database/drizzle/` with `bun run db:migrate`.
- A new migration is validated on a clean database before merge. The
  migration history must stay intact; never edit an applied migration.
- Index migrations need separate evidence (query plan, observed filters) and
  do not ride along with a schema change.
- Row-level security policies ship in the same migration as the table they
  protect, with the negative tests described in
  [`test-plan.md`](test-plan.md) § 3.

### Feature flags

Flags gate integrations, automations and reports per organization. A flag is a
rollout control, not a permission: authorization still comes from membership
and role on the server (Decision 002).

- A flag has an owner and a removal date. Flags that outlive their rollout are
  debt.
- Flag evaluation happens in the use case, not in the route or in the UI, so
  the disabled path is testable without a browser.
- Initial data imports run in dry-run mode first and produce a report before
  writing.

### Kill switch

Every automated outbound effect (email delivery, provider calls, scheduled
jobs) has a kill switch per organization and a global one. Turning it off stops
the automation without blocking manual operations by members. The switch is a
flag with an audit event on every change.

## Minimal internal panel

An operator-only surface, outside the tenant UI, that shows:

- health of each external connection;
- outbox and job queue lag and size;
- rejected webhooks and inbox rows stuck in `processing`;
- retries and dead-letter rows;
- failed deliveries;
- retention jobs and their last report;
- export audit;
- feature flags and kill switches per organization.

The panel reads through the same use cases and RLS boundary as the product. It
never queries business tables with a superuser connection.

## Manual corrections

Every relevant manual correction generates an audit event with the actor, the
affected reference, the previous and new values allowed by the classification,
and the justification. A correction made directly in the database without an
audit event is an incident, not a fix.
