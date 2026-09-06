# Decision 020: row-level security with `FORCE`, and five negative proofs before exposure

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 00](../plans/fifilo/fase-00-fundacao-do-produto.md) and repeated by every
tenant table after it.

## Context

The repository already carries half of the mechanism. `applyWorkspaceContext`
and `applyActorContext` in `packages/infra/database/src/workspace.ts` set
`app.workspace_id` and `app.user_id` inside the transaction and read them back
to prove the setting took effect. `withWorkspaceTransaction` delivers a Drizzle
handle with that context applied.

The other half does not exist. There is no policy anywhere in the repository:
`create policy` and `enable row level security` appear in no migration and in
no source file. That is coherent rather than an oversight — the starter is
domain-neutral and owns no tenant table, and `test-plan.md` § 3 states that the
first tenant-owned table must ship with this coverage before its data is
exposed.

Fifilo introduces that table. This decision turns the stated intention into a
gate, and records the two ways this mechanism is usually installed wrong.

The first is subtle enough to be worth spelling out. PostgreSQL documents that
a table owner normally **bypasses** row security, and that a superuser or a
role with `BYPASSRLS` always does. An application that connects as the role
owning its tables — the default in most setups, including the Compose file in
this repository — will run every query with the policy inert. The policies
exist, the migration is green, the suite passes, and nothing is protected.
`ALTER TABLE ... FORCE ROW LEVEL SECURITY` is what subjects the owner to its
own policies.

The second is that a policy with `USING` and no `WITH CHECK` filters reads and
permits a write that plants a row belonging to another tenant.

## Options considered

1. **Isolation in the application only** — `where organization_id = ...` in
   every query. One forgotten predicate is a leak. The analytics projections of
   [Fase 05](../plans/fifilo/fase-05-analytics-e-graficos.md) use CTEs and
   window functions, which multiplies the places a predicate can be dropped
   without the result looking wrong.
2. **`ENABLE ROW LEVEL SECURITY` with policies, application connecting as the
   table owner.** Looks complete in review and in the migration diff, protects
   nothing at runtime.
3. **`ENABLE` plus `FORCE`, a policy with both `USING` and `WITH CHECK`,
   shipped in the same migration as the table, and five negative proofs
   required before the table is exposed by a route.**

## Decision

Adopt option 3.

### The policy

```sql
alter table <t> enable row level security;
alter table <t> force  row level security;

create policy <t>_workspace on <t>
  using      (organization_id = nullif(current_setting('app.workspace_id', true), ''))
  with check (organization_id = nullif(current_setting('app.workspace_id', true), ''));
```

`current_setting(..., true)` returns `NULL` instead of raising when the setting
is absent, so a query outside a workspace transaction is empty rather than an
error at an unpredictable place. `nullif(..., '')` prevents an empty string
from being treated as a tenant that matches.

The policy ships in the same migration as the table it protects. A migration
that adds a tenant table without it is incomplete, not staged.

### The five proofs

`packages/infra/database/src/tests/` holds them, against real PostgreSQL. They
are the same list `test-plan.md` § 3 requires, stated as assertions:

1. under A's context, A writes and reads its own row;
2. under B's context, A's row is not visible;
3. under B's context, a write carrying A's `organization_id` is rejected —
   this is the proof that `WITH CHECK` exists and that `FORCE` is in effect;
4. with no context set, the read returns zero rows;
5. an error mid-transaction rolls back, and the context does not survive into
   the next use of the pooled connection.

A tenant table without all five is not exposed by a route. There is no partial
credit: proof 3 is the one that fails when `FORCE` was forgotten, and it is the
one most likely to be skipped as redundant.

### Runtime role

Two roles in any environment that is not a developer machine: a migration role
that owns the schema, and a runtime role that is subject to the policies. The
runtime role is never a superuser and never carries `BYPASSRLS`, because
neither is affected by `FORCE`.

### The application does not re-filter the tenant

A repository query does not add `where organization_id = ...` on top of the
policy. Doing so makes every test pass whether or not the policy works, which
removes the only signal that the mechanism is alive. Isolation is the
database's job; the application's job is to open the transaction that carries
the context.

The consequence is deliberate: a query written outside `withWorkspaceTransaction`
returns nothing. Loud and empty is the intended failure, not silently
cross-tenant.

## Consequences

- Tenant isolation becomes a property of the database, verifiable without
  reading application code.
- Every persistence test needs real PostgreSQL and an explicit context. A
  mocked database cannot prove any of the five, which `test-plan.md` § 3
  already assumes.
- Context is transaction-local by construction (`set_config(..., true)`), which
  is what makes connection pooling safe. Every repository access goes through
  the workspace transaction.
- The operator surface described in
  [`operation.md`](../engineering/operation.md) cannot read across workspaces by
  turning this off. It reads through the same boundary, or it gets its own role
  and an audited path.
- Adding a tenant table costs a fixed, mechanical amount of work: policy plus
  five tests. That predictability is the point.

## Revisit when

- A connection pooler in statement mode is introduced. Transaction-local
  `set_config` semantics must be re-verified before it reaches production.
- A capability legitimately needs to read across workspaces. It gets its own
  role and audit trail; `FORCE` does not come off.
- PostgreSQL changes the documented behavior of `FORCE ROW LEVEL SECURITY` or
  of policy evaluation for table owners.
- The tenant column stops being `organization_id`, which would rewrite every
  policy at once.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 004: `set_config` and `current_setting` are a named, sanctioned raw
  SQL exception.
- Decision 019: the composite key covers the case policies are documented not
  to cover — referential integrity checks bypass row security.
- Decision 002: the server decides authorization; the policy is the floor
  beneath it, not a replacement.
- [`test-plan.md`](../engineering/test-plan.md) § 3 and
  [`security.md`](../engineering/security.md).
