# Decision 026: the organization is the financial workspace; `viewer` is the read-only role, decided in the use case

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 04](../plans/fifilo/fase-04-workspace-compartilhado.md).

## Context

Better Auth's organization plugin ships three roles - `owner`, `admin`,
`member` - and all three can write every financial resource once a member.
Sharing a workspace with a spouse, a partner or an accountant needs a
fourth: someone who sees the numbers without being able to change them.
Nothing in the starter enforces that a role beyond "member of this
organization" governs anything Fifilo itself owns (accounts, categories,
transactions, invoices) - Better Auth's own access control only ever
covered *its* resources (organization, member, invitation, team).

## Options considered

1. **Check the role in the route handler**, ahead of calling the use case.
   Cheaper to write once, but the check then lives in as many places as
   there are routes, and nothing stops a new route from being added without
   it - exactly the "viewer leaking through a forgotten route" failure Fase
   04 § Riscos names.
2. **Check the role inside the use case itself**, as the first statement,
   before any repository read. Testable without a route, a session or a
   browser (Fase 04 § Riscos: "o caminho negado é testável sem navegador"),
   and a route literally cannot forget it - the use case will not run
   without it.

## Decision

Adopt option 2.

### `viewer` is declared, not implied

Better Auth's `roles` option needs an explicit `viewer` access-control role
or `inviteMember`/`updateMemberRole` reject it as an unknown value.
`packages/auth/src/roles.ts` declares `viewerAc` - empty on every
Better-Auth-owned statement (organization, member, invitation, team, ac) -
and is imported by both `server.ts` (via `organization.ts`) and `client.ts`,
neither of which may import the other: the shared file has no database
dependency, so both sides infer the identical role shape.

### The financial matrix is Fifilo's own, not Better Auth's

`packages/core/src/access-control.ts`'s `requireFinancialWriteAccess` is the
one function every financial write use case calls first:
`accounts`, `categories`, `transactions`, `credit-cards` - create, update,
archive, reassign, attach, close, pay, install. It rejects `viewer` and
passes everyone else, because the matrix Fase 04 § Modelagem declares gives
owner, admin and member identical write access to every financial resource;
only membership/invitation management and (eventually) settings distinguish
further, and neither exists as enforced code yet.

### The route resolves the role once and passes it in

`toWorkspaceRole` turns `ActorContext.role` (already sourced from
`members.role`, never the client - Decision 002) into the closed
`WorkspaceRole` union, failing closed to `viewer` for any value the column
has never actually held. Every route thread it into its command as
`role: toWorkspaceRole(context.role)`; nothing computes or trusts a role
value from anywhere else.

### The sweep proves the route, not just the use case

`apps/api/src/access-control-sweep.test.ts` enumerates `app.routes` itself
- the same composition `server.ts` boots - for every write method under the
financial prefixes, and fails loudly if one has no fixture proving a viewer
gets `403`. A new write route with no entry in the sweep's fixture map is a
thrown error, not a silently-skipped assertion.

## Consequences

- A financial write use case's error union always includes
  `AccessControlError`; every command gains a required `role` field. This
  touched every write use case shipped in Fases 01-03 in one pass.
- A route that reads before checking the role (Fase 03's original
  `close-invoice` handler did, to fetch the current version) leaks a
  resource's existence to a denied viewer before the check ever runs - found
  and fixed while building this decision's own sweep, not before.
- Adding a financial write route without threading the role through is a
  compile error (the command type requires it) long before it is a security
  incident.
- Better Auth's own access control and Fifilo's financial matrix are two
  separate systems that happen to share one role name per level; a role
  added to one does not automatically appear in the other.

## Revisit when

- Settings (Fase 06) or per-resource sharing needs member/admin to diverge
  on some financial resource - today they are identical, and
  `requireFinancialWriteAccess` treats them as one gate. A finer matrix
  needs a role parameter in the check, not just a boolean.
- Export (named in Fase 04 § Modelagem, not built) ships - it needs its own
  authorization narrower than "any non-viewer."

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 002: validation and authorization decided at the boundary/use
  case, never trusting client-sent evidence - this decision applies the same
  principle to role.
- Decision 019: the composite key is the tenant proof; this decision is the
  same argument one layer up - membership proves tenancy, role proves what
  that membership may do inside it.
- `packages/auth/src/roles.ts`, `packages/core/src/access-control.ts`,
  `apps/api/src/access-control-sweep.test.ts`.
