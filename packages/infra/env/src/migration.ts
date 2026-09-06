import { z } from 'zod'

import { type RuntimeEnv, readRuntimeEnv } from './runtime'

export const migrationEnvSchema = z.object({
  DATABASE_MIGRATION_URL: z.url(),
})

export const createMigrationEnv = (runtimeEnv: RuntimeEnv = readRuntimeEnv()) =>
  migrationEnvSchema.parse(runtimeEnv)

export const migrationEnv = createMigrationEnv()
export type MigrationEnv = z.infer<typeof migrationEnvSchema>
