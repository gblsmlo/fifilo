import { auth } from '@fifilo/auth/server'
import { db } from '@fifilo/infra-database/client'
import { members, organizations, sessions } from '@fifilo/infra-database/schema'
import { and, eq } from 'drizzle-orm'

export type ActorContext = {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
  userId: string
}

export type ActorResolution =
  | { ok: true; context: ActorContext }
  | { ok: false; status: 401 | 403; code: string; message: string }

export type ActorResolver = (request: Request) => Promise<ActorResolution>

export const resolveSessionActorContext: ActorResolver = async (request) => {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return {
      ok: false,
      status: 401,
      code: 'unauthenticated',
      message: 'Authentication required.',
    }
  }

  let organizationId = session.session.activeOrganizationId

  if (!organizationId) {
    const memberships = await db
      .select({
        organizationId: members.organizationId,
        role: members.role,
      })
      .from(members)
      .where(eq(members.userId, session.user.id))
      .limit(2)

    const [onlyMembership] = memberships

    if (!onlyMembership || memberships.length > 1) {
      return {
        ok: false,
        status: 403,
        code: 'no_active_workspace',
        message: 'An active workspace is required.',
      }
    }

    organizationId = onlyMembership.organizationId

    await db
      .update(sessions)
      .set({ activeOrganizationId: organizationId })
      .where(eq(sessions.id, session.session.id))
  }

  if (!organizationId) {
    return {
      ok: false,
      status: 403,
      code: 'no_active_workspace',
      message: 'An active workspace is required.',
    }
  }

  const [member] = await db
    .select({
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      role: members.role,
    })
    .from(members)
    .innerJoin(organizations, eq(organizations.id, members.organizationId))
    .where(and(eq(members.userId, session.user.id), eq(members.organizationId, organizationId)))
    .limit(1)

  if (!member) {
    return {
      ok: false,
      status: 403,
      code: 'no_active_membership',
      message: 'Active membership is required for this workspace.',
    }
  }

  return {
    ok: true,
    context: {
      organizationId,
      organizationName: member.organizationName,
      organizationSlug: member.organizationSlug,
      role: member.role,
      userId: session.user.id,
    },
  }
}
