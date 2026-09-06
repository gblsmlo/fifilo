import { generateId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { members, notificationOutbox, sessions } from '@fifilo/infra-database/schema'
import { serverEnv } from '@fifilo/infra-env/server'
import { auditEvent } from '@fifilo/observability/runtime'
import { APIError } from 'better-auth'
import type { OrganizationOptions } from 'better-auth/plugins'
import { and, eq, ne } from 'drizzle-orm'

const ORGANIZATION_INVITATION_TTL_SECONDS = 60 * 60 * 48
const ORGANIZATION_MEMBERSHIP_LIMIT = 25

const auditOrganizationEvent = async (action: string, context: Record<string, unknown>) => {
  auditEvent({
    action,
    actorType: 'system',
    metadata: context,
    workspaceId: typeof context.organizationId === 'string' ? context.organizationId : undefined,
  })
}

const sendOrganizationInvitation: NonNullable<OrganizationOptions['sendInvitationEmail']> = async ({
  email,
  id,
  invitation,
  inviter,
  organization,
}) => {
  const invitationUrl = new URL('/accept-invitation', serverEnv.APP_URL)
  invitationUrl.searchParams.set('invitationId', id)

  await db.insert(notificationOutbox).values({
    id: generateId(),
    eventType: 'organization.invitation.email',
    payload: {
      invitationId: id,
      invitationUrl: invitationUrl.toString(),
      inviterEmail: inviter.user.email,
      inviterMemberId: inviter.id,
      organizationId: organization.id,
      organizationName: organization.name,
      role: invitation.role,
    },
    recipientEmail: email,
  })

  await auditOrganizationEvent('organization invitation email queued', {
    invitationId: id,
    inviterMemberId: inviter.id,
    organizationId: organization.id,
    role: invitation.role,
  })
}

const assertOrganizationKeepsOwner = async (
  organizationId: string,
  memberId: string,
  message = 'Organization must keep at least one owner.',
) => {
  const [remainingOwner] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.organizationId, organizationId),
        eq(members.role, 'owner'),
        ne(members.id, memberId),
      ),
    )
    .limit(1)

  if (!remainingOwner) {
    throw new APIError('BAD_REQUEST', {
      message,
    })
  }
}

const clearActiveOrganizationSessions = async (userId: string, organizationId: string) => {
  await db
    .update(sessions)
    .set({ activeOrganizationId: null })
    .where(and(eq(sessions.userId, userId), eq(sessions.activeOrganizationId, organizationId)))
}

export const organizationOptions = {
  allowUserToCreateOrganization: true,
  cancelPendingInvitationsOnReInvite: true,
  creatorRole: 'owner',
  disableOrganizationDeletion: true,
  dynamicAccessControl: {
    enabled: false,
  },
  invitationExpiresIn: ORGANIZATION_INVITATION_TTL_SECONDS,
  membershipLimit: ORGANIZATION_MEMBERSHIP_LIMIT,
  requireEmailVerificationOnInvitation: true,
  sendInvitationEmail: sendOrganizationInvitation,
  teams: {
    enabled: false,
  },
  organizationHooks: {
    afterAcceptInvitation: async ({ invitation, member, organization, user }) => {
      await auditOrganizationEvent('organization member joined', {
        invitationId: invitation.id,
        memberId: member.id,
        organizationId: organization.id,
        subjectUserId: user.id,
      })
    },
    afterCreateInvitation: async ({ invitation, inviter, organization }) => {
      await auditOrganizationEvent('organization invitation created', {
        invitationId: invitation.id,
        inviterId: inviter.id,
        organizationId: organization.id,
      })
    },
    afterRemoveMember: async ({ member, organization, user }) => {
      await clearActiveOrganizationSessions(user.id, organization.id)
      await auditOrganizationEvent('organization member removed', {
        memberId: member.id,
        organizationId: organization.id,
        subjectUserId: user.id,
      })
    },
    afterUpdateMemberRole: async ({ member, organization, previousRole, user }) => {
      await auditOrganizationEvent('organization member role changed', {
        memberId: member.id,
        nextRole: member.role,
        organizationId: organization.id,
        previousRole,
        subjectUserId: user.id,
      })
    },
    beforeUpdateMemberRole: async ({ member, newRole, organization }) => {
      if (member.role === 'owner' && newRole !== 'owner') {
        await assertOrganizationKeepsOwner(
          organization.id,
          member.id,
          'Organization must keep at least one owner before demoting this member.',
        )
      }
    },
    beforeRemoveMember: async ({ member, organization }) => {
      await assertOrganizationKeepsOwner(organization.id, member.id)
    },
  },
} satisfies OrganizationOptions
