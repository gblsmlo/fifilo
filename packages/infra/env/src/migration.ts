import { z } from 'zod'

import { type RuntimeEnv, readRuntimeEnv } from './runtime'

export const migrationEnvSchema = z.object({
  DATABASE_MIGRATION_URL: z.url(),
  // Read by the role-bootstrap script only (Decision 020): the runtime role
  // `DATABASE_URL` connects as, which must stay a non-superuser without
  // BYPASSRLS for `FORCE ROW LEVEL SECURITY` to have any effect.
  POSTGRES_APP_PASSWORD: z.string().min(1),
  POSTGRES_APP_USER: z.string().min(1),
})

export const createMigrationEnv = (runtimeEnv: RuntimeEnv = readRuntimeEnv()) =>
  migrationEnvSchema.parse(runtimeEnv)

export const migrationEnv = createMigrationEnv()
export type MigrationEnv = z.infer<typeof migrationEnvSchema>
