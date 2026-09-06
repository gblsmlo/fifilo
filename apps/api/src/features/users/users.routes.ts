import { auth } from '@twincam/auth/server'
import { currentUserResponseSchema } from '@twincam/core/contracts/users'
import { Elysia } from 'elysia'

import { errorEnvelopeSchema } from '../../libs/http-errors'
import type { ActorResolver } from '../auth'

const unauthenticatedResponse = {
  error: {
    code: 'unauthenticated',
    message: 'Authentication required.',
  },
}

export type UserRouteDependencies = {
  resolveActor?: ActorResolver
  resolveSession?: (request: Request) => Promise<SessionUser | null>
}

type SessionUser = {
  email: string
  id: string
  image?: string | null
  name?: string | null
}

const defaultResolveActor: ActorResolver = async (request) => {
  const { resolveSessionActorContext } = await import('../auth/actor')
  return resolveSessionActorContext(request)
}

const defaultResolveSession = async (request: Request): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user ?? null
}

export const createUserRoutes = ({
  resolveActor = defaultResolveActor,
  resolveSession = defaultResolveSession,
}: UserRouteDependencies = {}) =>
  new Elysia({ prefix: '/api' }).get(
    '/me',
    async ({ request, set }) => {
      const user = await resolveSession(request)

      if (!user) {
        set.status = 401
        return unauthenticatedResponse
      }

      const actorContext = await resolveActor(request)

      return currentUserResponseSchema.parse({
        organization: actorContext.ok
          ? {
              id: actorContext.context.organizationId,
              name: actorContext.context.organizationName,
              slug: actorContext.context.organizationSlug,
            }
          : null,
        role: actorContext.ok ? actorContext.context.role : null,
        user: {
          email: user.email,
          id: user.id,
          image: user.image ?? null,
          name: user.name?.trim() || user.email,
        },
      })
    },
    {
      response: {
        200: currentUserResponseSchema,
        401: errorEnvelopeSchema,
      },
    },
  )
