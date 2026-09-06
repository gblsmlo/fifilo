import { createAuthClient } from 'better-auth/client'
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      teams: {
        enabled: false,
      },
    }),
    twoFactorClient({
      twoFactorPage: '/two-factor',
    }),
  ],
})
