import { describe, expect, test } from 'bun:test'
import type { LogEvent } from '@twincam/observability'
import { Elysia } from 'elysia'

import { createAuthRoutes } from './auth.routes'

type AuthRouteDependencies = NonNullable<Parameters<typeof createAuthRoutes>[0]>

const headers = {
  'content-type': 'application/json',
}

const createApp = (dependencies: AuthRouteDependencies) =>
  new Elysia().use(createAuthRoutes(dependencies))

const createDependencies = (
  overrides: Partial<AuthRouteDependencies> = {},
): AuthRouteDependencies & { logs: LogEvent[] } => {
  const logs: LogEvent[] = []

  return {
    async findUserByEmail() {
      return null
    },
    log(event) {
      logs.push(event)
    },
    logs,
    async provisionUser(input) {
      return {
        email: input.email,
        id: 'user_1',
        name: input.name,
      }
    },
    ...overrides,
  }
}

const signUpRequest = (body: unknown) =>
  new Request('http://localhost/api/auth/sign-up', {
    body: JSON.stringify(body),
    headers,
    method: 'POST',
  })

describe('auth routes', () => {
  test('creates a verified user and returns a sign-up success response', async () => {
    const dependencies = createDependencies()
    const response = await createApp(dependencies).handle(
      signUpRequest({
        email: 'ANA@Example.com',
        name: 'Ana',
        password: 'correct-horse-1',
      }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      message: 'Conta criada com sucesso. Entre para continuar.',
      user: {
        email: 'ana@example.com',
        id: 'user_1',
        name: 'Ana',
      },
    })
    expect(dependencies.logs).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: 'auth.sign_up.created',
      }),
    )
  })

  test('returns conflict when the email already exists', async () => {
    const dependencies = createDependencies({
      async findUserByEmail() {
        return {
          email: 'ana@example.com',
          id: 'user_1',
          name: 'Ana',
        }
      },
    })

    const response = await createApp(dependencies).handle(
      signUpRequest({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'correct-horse-1',
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'conflict',
        message: 'Ja existe uma conta com este e-mail.',
      },
    })
  })

  test('returns a controlled error when provisioning fails unexpectedly', async () => {
    const dependencies = createDependencies({
      async provisionUser() {
        throw new Error('database unavailable')
      },
    })

    const response = await createApp(dependencies).handle(
      signUpRequest({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'correct-horse-1',
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'internal_error',
        message: 'Nao foi possivel criar a conta agora. Tente novamente em alguns instantes.',
      },
    })
    expect(dependencies.logs).toContainEqual(
      expect.objectContaining({
        level: 'error',
        message: 'auth.sign_up.provision_failed',
      }),
    )
  })
})
