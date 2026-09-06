import { CurrentUserUnauthenticatedError, fetchCurrentUser } from '@features/users/current-user'
import { redirect } from '@tanstack/react-router'
import type { CurrentUserResponse } from '@twincam/core/contracts/users'

import { encodeAuthRedirect } from './utils/redirect'

export const loadAuthenticatedRoute = async (
  locationHref: string,
  getCurrentUser: () => Promise<CurrentUserResponse> = fetchCurrentUser,
) => {
  const redirectTo = encodeAuthRedirect(locationHref)

  try {
    const session = await getCurrentUser()
    return {
      currentOrganization: session.organization,
      currentRole: session.role,
      currentUser: session.user,
      redirectTo,
    }
  } catch (error) {
    if (!(error instanceof CurrentUserUnauthenticatedError)) {
      throw error
    }

    throw redirect({
      to: '/login',
      search: {
        redirect: redirectTo,
      },
    })
  }
}
