# Decision 035: onboarding uses a dedicated layout

## Status

Active. Recorded on 2026-09-12 for the Fifilo product domain.

## Context

Financial onboarding is a focused setup journey. The authenticated app shell
contains navigation and workspace controls that are not part of this journey.

## Options considered

1. Render onboarding inside `(authenticated)` and reuse `AppLayout`.
2. Keep onboarding routes authenticated but render a separate full-viewport
   `OnboardingLayout`.

## Decision

Adopt option 2. The onboarding route group owns organization creation, setup,
and invitation acceptance, and its shell receives the application name from
the route context. Normal authenticated routes continue to use `AppLayout`.

## Consequences

- Onboarding never renders `AppSidebar`, `AppHeader`, `SidebarProvider`, or
  `AppLayout`.
- Refreshes can resume the status-derived step without a URL step parameter.
- Invitation acceptance has the same focused shell as setup.

## Revisit when

The setup journey becomes part of a broader navigation experience with a
deliberate need for persistent app navigation.

## Related

- [`docs/decisions/README.md`](README.md) resolves decision numbers.
- Decision 006: component ownership and shell boundaries.
