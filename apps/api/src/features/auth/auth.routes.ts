import {
  signUpErrorResponseSchema,
  signUpRequestSchema,
  signUpResponseSchema,
} from '@fifilo/core/contracts/auth'
import { logEvent } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'

import { mapValidationError } from '../../libs/http-errors'

interface AuthRouteUser {
  email: string
  id: string
  name?: string | null
}

interface AuthRouteDependencies {
  findUserByEmail: (email: string) => Promise<AuthRouteUser | null>
  log: typeof logEvent
  provisionUser: (input: {
    email: string
    name: string
    password: string
  }) => Promise<AuthRouteUser>
}

const conflict = (message: string) => ({
  error: {
    code: 'conflict',
    message,
  },
})

const internalError = () => ({
  error: {
    code: 'internal_error',
    message: 'Nao foi possivel criar a conta agora. Tente novamente em alguns instantes.',
  },
})

const errorStatuses = {
  400: signUpErrorResponseSchema,
  409: signUpErrorResponseSchema,
  500: signUpErrorResponseSchema,
} as const

const createSignUpResponse = (user: AuthRouteUser) => ({
  message: 'Conta criada com sucesso. Entre para continuar.',
  user: {
    email: user.email,
    id: user.id,
    name: user.name?.trim() || user.email,
  },
})

const emailDomain = (email: string) => email.split('@')[1] ?? 'unknown'

const isDuplicateUserError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('duplicate') ||
    message.includes('already exists') ||
    message.includes('unique')
  )
}

const defaultDependencies: AuthRouteDependencies = {
  async findUserByEmail(email) {
    const { auth } = await import('@fifilo/auth/server')
    const ctx = await auth.$context
    const existingUser = await ctx.internalAdapter.findUserByEmail(email)
    return existingUser?.user ?? null
  },
  log: logEvent,
  async provisionUser(input) {
    const { provisionVerifiedCredentialUser } = await import('./provision-user')
    return provisionVerifiedCredentialUser(input)
  },
}

export const createAuthRoutes = (dependencies: AuthRouteDependencies = defaultDependencies) =>
  new Elysia({ prefix: '/api/auth' }).onError(mapValidationError).post(
    '/sign-up',
    async ({ body, set }) => {
      const email = body.email.toLowerCase()
      const existingUser = await dependencies.findUserByEmail(email)

      if (existingUser) {
        dependencies.log({
          level: 'warn',
          message: 'auth.sign_up.conflict',
          context: {
            emailDomain: emailDomain(email),
          },
        })
        set.status = 409
        return conflict('Ja existe uma conta com este e-mail.')
      }

      try {
        const user = await dependencies.provisionUser({
          email,
          name: body.name,
          password: body.password,
        })

        dependencies.log({
          level: 'info',
          message: 'auth.sign_up.created',
          context: {
            emailDomain: emailDomain(email),
            userId: user.id,
          },
        })

        set.status = 201
        return createSignUpResponse(user)
      } catch (error) {
        if (isDuplicateUserError(error)) {
          dependencies.log({
            level: 'warn',
            message: 'auth.sign_up.provision_conflict',
            context: {
              emailDomain: emailDomain(email),
              error,
            },
          })

          set.status = 409
          return conflict('Ja existe uma conta com este e-mail.')
        }

        dependencies.log({
          level: 'error',
          message: 'auth.sign_up.provision_failed',
          context: {
            emailDomain: emailDomain(email),
            error,
          },
        })

        set.status = 500
        return internalError()
      }
    },
    {
      body: signUpRequestSchema,
      response: { 201: signUpResponseSchema, ...errorStatuses },
    },
  )
