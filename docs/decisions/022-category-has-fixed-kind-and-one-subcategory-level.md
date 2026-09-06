# Decision 022: a category has a fixed kind and one level of subcategory; it archives, it does not delete

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 02](../plans/fifilo/fase-02-categorias-e-transacoes.md).

## Context

The reference implementation of this domain let a category be deleted while
transactions still pointed at it. The fix that shipped there was reactive: a
foreign-key constraint that rejected the delete, with no path forward for the
person who genuinely wanted to retire a category. The category stayed forever,
unusable and undeletable, because closing it had no story beyond "you can't."

Fifilo's category also needs a kind, because a report by category is only
readable when every category answers one question — does this add to income
or subtract as an expense — and a shape that let one category serve both would
make every such report ambiguous by construction.

Hierarchy is the third question. Arbitrary nesting is the common default; it
also means every aggregation that groups by category needs a recursive query
or a materialized path the moment a second level appears, for a depth nobody
asked for.

## Options considered

1. **Arbitrary-depth hierarchy, hard delete guarded by a foreign key.** Costs a
   recursive query in every aggregation for a depth this product has no
   request for, and repeats the reference implementation's dead end: a
   category with history becomes permanently stuck.
2. **One level of subcategory, archive with an explicit reassignment flow.**
   A subcategory is a child of a top-level category, never of another
   subcategory. Closing a category with history moves its transactions to
   another category of the same kind, then archives — the exit the reference
   implementation never gave its users.

## Decision

Adopt option 2.

### Kind is fixed, and a subcategory inherits it

```ts
export type CategoryKind = 'expense' | 'income'
```

A category is created with a kind. A subcategory's kind must match its
parent's; the mismatch is a `validation` failure at creation
(`invalid_category_kind` in `packages/core/src/categories/use-cases/create-category.ts`),
never silently coerced.

### One level, enforced at creation

`parentId` points only at a category with no `parentId` of its own. Nesting a
category under a subcategory is rejected the same way a kind mismatch is —
the same error code, because both describe an invalid parent reference. Deeper
hierarchy has no requester and costs a recursive aggregation query the moment
it exists; flattening it out later is the harder direction.

### The name is scoped to (parent, kind)

Uniqueness is `(organization_id, coalesce(parent_id, ''), kind, lower(name))`,
filtered to active rows — the same partial-unique-index shape Decision 019's
tenant tables already use for accounts. "Transporte" under "Casa" and
"Transporte" at the top level are different categories on purpose.

### Archive is unconditional; delete is not offered

A category archives regardless of how many transactions point at it — the
history keeps reading correctly, because a transaction's `category_id`
survives the parent turning inactive. Fase 02 ships no raw delete endpoint at
all: the API only exposes create, edit and the reassignment flow below,
because an accidental miscreation is the same operation as a genuine
retirement from this product's point of view — both close the category, one
with nothing to move.

### Reassignment is the required exit for a category with history

```
POST /api/categories/:id/reassign
```

- Zero transactions reference the category: it archives immediately, no
  target required.
- One or more do: `targetCategoryId` is required, must share the source's
  kind, and every transaction moves to it before the source archives — one
  database transaction, so a failure partway through leaves nothing
  half-migrated (Fase 02 § Riscos).

## Consequences

- No recursive query anywhere in this codebase needs to exist for category
  hierarchy; a subcategory's parent is looked up once.
- A category is never permanently stuck the way the reference implementation's
  could be: every category has a closing path, immediate or via reassignment.
- A report grouping by category never encounters a category serving both
  kinds, and never needs to guess a subcategory's kind independently of its
  parent.
- Historical transactions keep a valid, readable category reference forever,
  archived or not.

## Revisit when

- A second level of subcategory gets an actual product requirement. The
  aggregation queries that assume one level are the first thing to
  re-estimate.
- Bulk category management (import, merge, split) needs a shape this
  single-target reassignment does not cover.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 019: the composite key and partial-unique-index shape a tenant
  table repeats; the category's name scope follows it.
- Decision 002: the server decides the invariant; the client never redeclares
  the kind-matching rule.
- `packages/core/src/categories/`.
