import { createAuthClient } from 'better-auth/client'
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins'

import { organizationRoles } from './roles'

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      // Mirrors `server.ts`'s own `roles` exactly (`roles.ts` is the shared,
      // database-free source) - without this the client falls back to
      // Better Auth's built-in owner/admin/member set and rejects `viewer`
      // as a type error on `inviteMember`/`updateMemberRole`.
      roles: organizationRoles,
      teams: {
        enabled: false,
      },
    }),
    twoFactorClient({
      twoFactorPage: '/two-factor',
    }),
  ],
})
