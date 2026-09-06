# Decision 019: the composite key `(organization_id, id)` is the tenant proof

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 00](../plans/fifilo/fase-00-fundacao-do-produto.md).

## Context

The reference implementation of this domain shipped a foreign key from
transaction to category and assumed it protected ownership. It did not. The
constraint proved the category existed; nothing proved it belonged to the
caller. A user could attach another user's category to their own transaction by
sending an id they had no business knowing, and the database accepted it.

That was found by reading, not by a test, and the fix was an explicit ownership
lookup in the use case. The fix is correct and it is also fragile: it protects
the call sites that remember.

Row-level security does not close the gap either, and this is the part that is
easy to get wrong. PostgreSQL documents that referential integrity checks —
unique and primary key constraints, foreign key references — **always bypass
row security**, so that data integrity is preserved. A policy on `categories`
stops the wrong tenant from reading or writing a row. It does not stop a row in
another table from pointing at it.

So the product needs a mechanism that makes a cross-tenant reference
unrepresentable, not merely unlikely.

## Options considered

1. **Simple `id` primary key, simple foreign keys, ownership verified in the
   use case.** What the reference implementation did. It works while every
   author remembers, and there is no gate that fails when one does not. The
   first omission is a cross-tenant leak with no symptom.
2. **Simple keys plus a database trigger per relation** that validates the
   tenant. Correct and enforced, but it is one trigger per foreign key,
   invisible when reading the schema, and expensive to review or migrate.
3. **Composite primary key `(organization_id, id)` and composite foreign keys
   that carry `organization_id`.** The reference is checked by the database
   against both columns, so pointing at another workspace has no representation.

## Decision

Adopt option 3.

### Shape of a tenant table

```ts
primaryKey({ columns: [table.organizationId, table.id] })
```

and every foreign key between tenant tables carries the organization:

```ts
foreignKey({
  columns: [table.organizationId, table.categoryId],
  foreignColumns: [categories.organizationId, categories.id],
})
```

A tenant table without the composite primary key is a review finding, and so is
a simple foreign key between two tenant tables.

### What stays simple

Foreign keys to `users` and `organizations` stay single-column: those tables
are not tenant-owned, and the Better Auth tables keep the shape Better Auth
generates. The product does not reshape them.

### `id` remains an opaque application string

Decision 014 is unchanged. What changes is the scope of its uniqueness: an `id`
is unique within an organization, not globally. This costs nothing, because no
route ever resolves an id outside a workspace context — the actor's
organization is resolved from the session before any lookup happens.

### Relationship to row-level security

Decision 020 and this one protect different things and neither replaces the
other:

- the policy stops a tenant from **reading or writing** rows of another tenant;
- the composite key stops a row from **pointing at** a row of another tenant,
  which is exactly the case the policy is documented not to cover.

## Consequences

- The category defect that the reference implementation shipped is not
  expressible in this schema.
- Primary keys and foreign key indexes are wider by one `text` column. Accepted:
  the tenant column is in nearly every predicate anyway, so the composite index
  usually serves the query that the single-column index would have.
- Migrations that add a tenant table have one fixed shape, which makes review
  mechanical.
- Explicit ownership lookups in use cases stop being the only line of defense.
  They remain where they express a rule — an archived category rejecting a new
  transaction — not where they were substituting for the database.

## Revisit when

- A legitimate relation across workspaces appears, such as a shared template
  catalog. It is modeled as a non-tenant table with its own access rule, not by
  weakening this decision.
- Index size or write amplification on a large table becomes a measured
  problem, with a query plan attached.
- PostgreSQL changes the documented behavior of referential integrity checks
  under row security. That is the premise this decision rests on.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 014: the id is opaque; this decision changes only the scope of its
  uniqueness.
- Decision 020: the policy layer, which this decision complements.
- Decision 002: authorization is decided on the server; a client-supplied
  organization id is never evidence.
