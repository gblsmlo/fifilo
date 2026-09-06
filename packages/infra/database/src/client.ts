import { serverEnv } from '@twincam/infra-env/server'
import { SQL } from 'bun'
import { drizzle } from 'drizzle-orm/bun-sql'

import { databaseSchema } from './schema'

export const sqlClient = new SQL(serverEnv.DATABASE_URL, {
  max: serverEnv.DATABASE_POOL_MAX,
  idleTimeout: 30,
  maxLifetime: 60 * 60,
  connectionTimeout: 10,
  prepare: true,
})

export const db = drizzle({
  client: sqlClient,
  schema: databaseSchema,
})

/**
 * The full Drizzle transaction handle exposed at the workspace boundary.
 * Type-only alias so consumers can annotate without importing the runtime `db`.
 */
export type WorkspaceTx = Parameters<Parameters<typeof db.transaction>[0]>[0]
