# Decision 016: a parent issue exists only when there are two or more independent deliveries

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 026; the starter keeps the rule and drops the product-specific evidence.

## Context

The reference product's planning flow made the parent issue unconditional.
Every delivery, whatever its size, got a parent issue, an index plan, a plan
approval, and then child issues with their own plans. The cost showed up in the
repository: parents with zero or one child, created only to wrap a single
delivery that could have been the executable issue directly. One delivery of
three code changes cost eleven artifacts.

The problem was not the existence of the boundary. It was being unconditional.
A one-line fix crossed the same ceremony as a delivery of three capabilities.

The starter has no product organization and no specification directory, so the
product gate of the source decision does not apply. What survives is the
decomposition gate, which is about the shape of the work, not about who owns
the rule behind it. Plans live in `docs/plans/`.

## Options considered

1. **Keep the parent unconditional.** Preserves symmetry and produces empty
   envelopes: a parent plus one child for most deliveries.
2. **Never decompose.** One issue per delivery regardless of size. A delivery
   with three independent acceptance cycles gets one review thread and one
   plan that cannot be approved in parts.
3. **Make the parent conditional on a verifiable criterion.** The boundary
   exists when what it protects is in play, and does not exist when it is not.

## Decision

Adopt option 3.

### The gate

Before planning, ask one question:

> Are there two or more deliveries with independent acceptance, evidence and
> review cycles?

- **Yes.** A parent exists: a parent issue, an index plan in `docs/plans/` in
  the shape context + objective, approval of that plan, then child issues with
  their own plans.
- **No.** No parent. The delivery is a single executable issue with a single
  plan in `docs/plans/` gathering context, objective, requirements and
  acceptance criteria. Decomposition stops being a phase and becomes a decision
  taken inside planning.

### Record the answer in the issue

The answer is written in the issue, in one line, with the deliveries it
counted. Without the record the gate disappears: whoever reads the issue later
cannot tell whether a parent was omitted on purpose or forgotten.

### Never split a vertical slice by layer

A delivery that touches `packages/core`, `apps/api` and `apps/web` for one
capability is one delivery. Splitting it into a "core issue", an "api issue"
and a "web issue" by convention creates three issues that cannot be accepted
independently: none of them works alone. The same logic one level up: a parent
is not created by convention either.

### The running example

Adding the health endpoint to the starter touched
`packages/core/src/contracts/health.ts`, `apps/api/src/features/health/` and
the E2E smoke in `e2e/`. One acceptance ("the endpoint answers `ok`"), one
evidence set, one review. One issue, one plan.

Adding organization-aware sign-up touched the same three layers and Better
Auth configuration. Still one acceptance: a person signs up and lands in an
organization. One issue.

Two deliveries with separate acceptance, for instance "invitation flow" and
"member role management", each testable and reviewable without the other, is
the case where a parent earns its place.

### What "independent" means

Independent acceptance: each delivery has criteria that can pass or fail
without the other. Independent evidence: each has its own tests or screenshots
that mean something alone. Independent review: each can merge alone without
leaving the main branch in a half-state.

If any of the three is shared, count it as one delivery.

## Consequences

- The common case in the starter, one capability slice, goes from a parent and
  children to one issue and one plan.
- The question is asked explicitly at the start of planning and the answer is
  recorded in the issue.
- A review that finds three issues for one vertical slice, or a parent with a
  single child, has a citable rule to request the merge.
- Existing plans in `docs/plans/` are not rewritten. History stays as it was
  delivered.

## Revisit when

- Single-capability deliveries start producing parents again. The gate is not
  being evaluated.
- A tracker with an API or CLI arrives and changes the real cost of each
  issue. The cost side of this decision was measured with manual transfer.
- A product organization and a specification directory appear in the starter.
  Then the product gate of the source decision is re-evaluated here as a
  separate clause.
- Deliveries counted as "one" repeatedly need to be split after the fact. The
  definition of independent above is too loose.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decisions 007 and 015 in prose: the feature structure a vertical slice
  crosses, and the index that this decision is addressed through.
- `docs/plans/`, where the single plan or the index plan lives.
