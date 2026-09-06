import { db } from '@fifilo/infra-database/client'
import { authSchema } from '@fifilo/infra-database/schema'
import { serverEnv } from '@fifilo/infra-env/server'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization, twoFactor } from 'better-auth/plugins'

import { organizationOptions } from './organization'

export const auth = betterAuth({
  appName: serverEnv.APP_NAME,
  baseURL: serverEnv.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 12,
    requireEmailVerification: true,
  },
  plugins: [
    organization(organizationOptions),
    twoFactor({
      issuer: serverEnv.APP_NAME,
    }),
  ],
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: serverEnv.BETTER_AUTH_TRUSTED_ORIGINS,
})
