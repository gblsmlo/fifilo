# Decision 003: `repository.ts` is a composition root

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 004; the starter keeps the rule and drops the product-specific evidence.

## Context

A Core port can gather every operation its use cases need without forcing the
whole Drizzle implementation into one file. When that distinction is implicit,
the repository file of a feature slice grows into the owner of queries, writes,
projections, mappers, audit and lookups at once. The reference product saw a
single `repository.ts` pass two thousand lines before it was split.

The risk is not size alone. The file that composes the adapter also becomes
the owner of almost all of its implementation. Every change carries unrelated
context, concepts with independent change cycles sit side by side, and
intermediate persistence types start to look like domain types.

The starter has no business repository yet: `users` reads through Better Auth
and `health` reads nothing. This decision fixes the shape before the first
capability adds one, so the first `repository.ts` is born as a composition
root and never has to be rescued.

## Options considered

1. **One file per repository.** Less navigation at first, but independent
   responsibilities pile up and every change loads unrelated context.
2. **Always split by technical layer** into `queries.ts`, `mappers.ts` and
   `repository.ts`. Predictable, but a single capability spreads across files
   that always change together.
3. **Keep the port stable and compose its implementation from sibling modules
   defined by cohesive responsibility.** Extract shared projections or queries
   only when there is real reuse.

## Decision

Adopt option 3.

### The port

- The Core port expresses what the use cases need. It lives in
  `packages/core` beside the use case, and it may stay wide when that is the
  right domain boundary. Splitting the adapter never requires splitting the
  port.

### The composition root

- In `apps/api/src/features/<feature>/`, `repository.ts` imports the sibling
  implementations and returns the object that satisfies the port. SQL, row
  types, mappers and persistence rules do not belong in that file.
- Sibling modules are defined by change cycle, ownership and atomicity. For a
  future `users` slice that would read as `user-read-persistence.ts`,
  `user-write-persistence.ts` or `membership-lookups.ts`. A query and its
  mapper may share a module when they serve only that one responsibility.
- Projections, mappers or queries get their own file when they are reused,
  have their own tests, or form a recognizable read boundary.
- Operations that must share one transaction stay in the same module, even
  when they perform more than one write. File separation never breaks
  atomicity. The transaction handle is the `WorkspaceTx` delivered by
  `withWorkspaceTransaction` from `@fifilo/infra-database/workspace`.
- Intermediate `*Row` types describe the real Drizzle shape, with identifiers
  as `string`. Conversion to Core types happens in the mapper or in a small
  named function at the persistence boundary (Decision 014).

### Before adding an operation

The implementation answers four questions:

1. Which port method and which use case require the operation?
2. Which module already owns the data, the change cycle and the transaction?
3. Does the operation change together with that module, or does it have
   independent evidence and maintenance?
4. Which tests show the behavior, the failure and the atomicity that apply?

If no cohesive owner exists, create a sibling module and add it to the
composition root. Do not create one file per method, and do not introduce a
generic abstraction without a second concrete need.

## Consequences

- People and agents navigate more files. A local `README.md` in the slice
  indexes responsibilities when the slice grows past a handful of modules.
- Diffs get smaller. A test can characterize one responsibility without
  loading the whole adapter.
- Module names communicate ownership, not the technical step of a query.
- The composition root becomes a poor place for shortcuts. A new operation
  requires finding its owner before writing SQL.
- Cohesion and the transactional boundary take precedence over arbitrary line
  limits.
- SQL, `*Row` types, mappers or capability ownership introduced into a
  `repository.ts` that already composes is a review finding.

## Revisit when

- The Core port stops representing a cohesive domain boundary.
- Measurements show that navigating between modules causes more rework than
  the separation avoids.
- A new transactional unit requires reorganizing responsibilities across
  modules.
- The data access strategy stops using a Drizzle adapter per feature slice.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 004 decides when a module may use raw SQL instead of the builder.
- Decision 001 fixes the typed transaction handle these modules receive.
- Decision 014 fixes the identifier rule at the persistence boundary.
