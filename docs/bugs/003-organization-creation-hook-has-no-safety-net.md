# BUG-003: a failure in `afterCreateOrganization` strands the workspace it just created

## State

Open.

## Severity

Defeito. Not a bloqueador: the hook's current body — one insert and one audit
event — fails rarely, and the workspace row itself is intact. It is recorded
because the failure is silent, the person cannot repair it, and every
capability that considers writing in that hook inherits it.

## Environment

- Revision reproduced by reading: `b2f65d3`, unchanged through `60bf185`.
- `better-auth@1.6.23`, `node_modules/better-auth/dist/plugins/organization/routes/crud-org.mjs`.
- Found while designing [Fase 06b](../plans/fifilo/fase-06b-ativacao-do-onboarding.md),
  which intended to seed the default categories in that hook and did not.

## Summary

`organizationHooks.afterCreateOrganization` runs after the organization and the
member rows are already committed, through separate adapter calls, with no
transaction around them and no `try/catch` around the hook. It also runs
**before** `setActiveOrganization`.

So an exception inside the hook leaves:

- the organization row committed,
- the member row committed,
- the session with no active organization,
- the client holding a 500.

The person is returned to `/onboarding`, and the retry fails with
`ORGANIZATION_ALREADY_EXISTS`, because the slug they just used is taken by the
workspace they cannot reach. The only way forward is a different name.

This repository writes two things in that hook today
([`packages/auth/src/organization.ts:118`](../../packages/auth/src/organization.ts)):
the `financial_onboarding_progress` row of Decision 034, and the
`financial onboarding started` audit event.

## Reproduction

Read, not executed — no fault was injected:

```
crud-org.mjs:74   const organization = await adapter.createOrganization({ ... })
crud-org.mjs:100  member = await adapter.createMember(data)
crud-org.mjs:137  if (options?.organizationHooks?.afterCreateOrganization) await options?.organizationHooks.afterCreateOrganization({ organization, user, member })
crud-org.mjs:142  if (ctx.context.session && !ctx.body.keepCurrentActiveOrganization) await adapter.setActiveOrganization(...)
```

```
$ grep -n "transaction" node_modules/better-auth/dist/plugins/organization/routes/crud-org.mjs
(no output)
```

`drizzleAdapter` is configured without transaction support
([`packages/auth/src/server.ts:13`](../../packages/auth/src/server.ts)), and
`withActorWorkspaceTransaction` opens a transaction of its own
([`packages/infra/database/src/workspace.ts:96`](../../packages/infra/database/src/workspace.ts)),
which does not enclose Better Auth's writes.

## Hypothesis

Better Auth treats `afterCreate*` hooks as notifications, not as part of the
creation. Nothing in this repository declared that assumption, so Decision 034
placed a tenant row in a hook that cannot guarantee it — and it read as safe,
because the insert is itself transactional.

The exposure is the window, not the insert.

## Closing condition

One of:

- the hook body is wrapped so that a failure is logged and swallowed, and a
  repair path exists that a returning owner triggers — the shape
  [Decision 036](../decisions/README.md) already uses for the default
  categories; or
- the progress row stops being written there and is derived or repaired the
  same way.

Either way, a fault injected into the hook must leave a workspace the creating
owner can still reach, with the active organization set.

## Related

- [`docs/bugs/README.md`](README.md) resolves `BUG-NNN` → file → state.
- Decision 034: financial onboarding belongs to the creating owner.
- Decision 036: the default category set is seeded by the onboarding, never by
  this hook — recorded because of this defect.
