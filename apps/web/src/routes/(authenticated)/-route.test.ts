import { describe, expect, test } from 'bun:test'
import { loadAuthenticatedRoute } from '@features/auth/route-guard'
import { CurrentUserUnauthenticatedError } from '@features/users/current-user'
import type { CurrentUserResponse } from '@twincam/core/contracts/users'

const currentUser: CurrentUserResponse = {
  organization: {
    id: 'org_1',
    name: 'Acme',
    slug: 'acme',
  },
  role: 'owner',
  user: {
    email: 'ana@example.com',
    id: 'user_1',
    image: null,
    name: 'Ana',
  },
}

describe('authenticated route bootstrap', () => {
  test('returns the current user after a refresh with a valid session', async () => {
    const context = await loadAuthenticatedRoute(
      'http://localhost/dashboard',
      async () => currentUser,
    )

    expect(context).toEqual({
      currentOrganization: currentUser.organization,
      currentUser: currentUser.user,
      currentRole: 'owner',
      redirectTo: 'dashboard',
    })
  })

  test('redirects to login when the current session is absent', async () => {
    await expect(
      loadAuthenticatedRoute('http://localhost/dashboard', async () => {
        throw new CurrentUserUnauthenticatedError()
      }),
    ).rejects.toMatchObject({
      options: {
        search: {
          redirect: 'dashboard',
        },
        to: '/login',
      },
    })
  })

  test('preserves operational bootstrap errors', async () => {
    const operationalError = new Error('Nao foi possivel carregar o usuario atual')

    await expect(
      loadAuthenticatedRoute('http://localhost/dashboard', async () => {
        throw operationalError
      }),
    ).rejects.toBe(operationalError)
  })
})
