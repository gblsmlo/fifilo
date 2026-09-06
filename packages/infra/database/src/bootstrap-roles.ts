import { migrationEnv } from '@fifilo/infra-env/migration'
import { logEvent } from '@fifilo/observability/runtime'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

/**
 * Creates (or updates the password of) the non-superuser role the application
 * connects as through `DATABASE_URL`, and grants it CRUD on every table the
 * migration role owns, present and future.
 *
 * This exists because the official PostgreSQL Docker image always bootstraps
 * `POSTGRES_USER` as a superuser, and a superuser is never subject to
 * `FORCE ROW LEVEL SECURITY` (Decision 020) — running the application as that
 * same role would make every policy inert while the migration and the test
 * suite both look complete. Idempotent: safe to run again after a password
 * rotation or against an already-bootstrapped database.
 */
const client = drizzle({ connection: migrationEnv.DATABASE_MIGRATION_URL })

const escapeLiteral = (value: string) => value.replace(/'/g, "''")

const appUser = migrationEnv.POSTGRES_APP_USER
const appPassword = escapeLiteral(migrationEnv.POSTGRES_APP_PASSWORD)

await client.execute(
  sql.raw(`
    do $$
    begin
      if not exists (select from pg_roles where rolname = '${escapeLiteral(appUser)}') then
        create role "${appUser}" login password '${appPassword}';
      else
        alter role "${appUser}" login password '${appPassword}';
      end if;
    end
    $$;
  `),
)

await client.execute(sql.raw(`grant usage on schema public to "${appUser}"`))
await client.execute(
  sql.raw(`grant select, insert, update, delete on all tables in schema public to "${appUser}"`),
)
await client.execute(
  sql.raw(
    `alter default privileges in schema public grant select, insert, update, delete on tables to "${appUser}"`,
  ),
)

logEvent({
  level: 'info',
  message: 'database.bootstrap_roles.completed',
  context: { appUser },
})

// A one-shot script, not a long-lived server: close the connection so the
// process exits instead of waiting on an idle pooled client.
await client.$client.end()
