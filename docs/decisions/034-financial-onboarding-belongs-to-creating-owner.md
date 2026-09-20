# Decision 034: financial onboarding belongs to the creating owner

## Status

Active. Recorded on 2026-09-12 for the Fifilo product domain.

## Context

Financial setup changes workspace-wide interpretation rules and creates the
first account. The setup must be offered to the person who created the
organization, while members and viewers must not inherit that responsibility.

## Options considered

1. Track onboarding only by organization, allowing any member to complete it.
2. Track progress by `(organization_id, user_id)` and require the creator's
   owner membership for eligibility.

## Decision

Adopt option 2. Better Auth's `afterCreateOrganization` hook creates the
   progress row for the creator. Completion remains derived from the existing
   workspace settings and financial account rows; dismissal only records a
   deferral.

## Consequences

- Onboarding is tenant-scoped and owner-specific.
- Role changes and missing progress rows make the actor ineligible without
  disabling the workspace's financial data.
- The progress table follows the tenant RLS rules in Decision 020.

## Revisit when

An organization needs delegated setup ownership or multiple owners need
independent onboarding progress.

## Related

- [`docs/decisions/README.md`](README.md) resolves decision numbers.
- Decision 020: row-level security with `FORCE`.
- Decision 026: authorization in Core use cases.
