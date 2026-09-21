# Decision 036: the default category set is seeded by the onboarding, never by the workspace-creation hook

## Status

Active. Recorded on 2026-09-21 for the Fifilo product domain.

## Context

A workspace was created with no category at all, so the first entry had nothing
to classify. Something has to write the default set, and where that write lives
decides what happens when it fails.

Better Auth's `afterCreateOrganization` runs after the organization and member
rows are already committed, outside any transaction, with no `try/catch` around
it, and before `setActiveOrganization`. A failure there leaves an organization
that exists, is not active, and whose slug now collides with the retry.

## Options considered

1. Write the set in `afterCreateOrganization`, alongside the onboarding
   progress row.
2. Seed lazily on the first `GET /categories` of a workspace with none.
3. Expose an idempotent `POST /api/onboarding/categories` that the onboarding
   setup calls on every entry.
4. Ask the person to choose their categories as a fourth onboarding step.

## Decision

Adopt option 3. The use case short-circuits on any existing category, archived
included, so the call is repeatable at the cost of one `select`, and the batch
is written in a single transaction.

Option 1 is refused for the failure mode above, which the person cannot repair.
Option 2 makes a `GET` write, so a read retry becomes a write. Option 4 adds a
step to the journey this capability exists to shorten, and turns the derived
completeness rule of Decision 034 into one with a declared step.

## Consequences

- Seeding is owner-only, the same eligibility as the rest of the onboarding.
- A workspace that skipped the setup has no categories until the owner returns
  through the reminder, which repairs it.
- `packages/auth` keeps the hook it already had; nothing new runs in that
  window.
- Completeness stays `settingsConfigured && accountCreated`. The seeding is not
  a step and is not visible.

## Revisit when

A workspace needs a category set that varies by product, locale or plan, or
membership without onboarding needs to bring its own categories.

## Related

- [`docs/decisions/README.md`](README.md) resolves decision numbers.
- Decision 022: a category has a fixed kind and one level of subcategory.
- Decision 034: financial onboarding belongs to the creating owner.
