import { sql } from 'drizzle-orm'

import { db } from '../client'

/**
 * Every integration test that needs real PostgreSQL calls this first, so a
 * missing service fails naming the prerequisite instead of surfacing as a
 * connection error indistinguishable from a regression (test-plan.md § 3).
 */
export const requirePostgres = async (): Promise<void> => {
  try {
    await db.execute(sql`select 1`)
  } catch (cause) {
    throw new Error(
      'PostgreSQL is required for this suite. Start it with `docker compose up -d --wait postgres` and apply migrations with `bun run db:migrate`.',
      { cause },
    )
  }
}
