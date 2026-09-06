import { adminAc, defaultAc, memberAc, ownerAc } from 'better-auth/plugins/organization/access'

/**
 * Read-only on every Better Auth org-management statement (organization,
 * member, invitation, team, ac) - a viewer manages nothing about the
 * workspace itself (Fase 04 § Modelagem). The financial matrix this role
 * also drives (accounts, categories, transactions, invoices) is a separate,
 * bespoke check (`@fifilo/core/access-control`); Better Auth's own access
 * control has no statement for a resource it never modeled.
 *
 * Shared by `server.ts` and `client.ts`, neither of which may import the
 * other: this file has no database or server-only dependency, so both sides
 * agree on the exact same role shape - the client needs it for its own type
 * inference on `inviteMember`/`updateMemberRole`, not just the server.
 */
export const viewerAc = defaultAc.newRole({
  ac: [],
  invitation: [],
  member: [],
  organization: [],
  team: [],
})

export const organizationRoles = {
  admin: adminAc,
  member: memberAc,
  owner: ownerAc,
  viewer: viewerAc,
}
