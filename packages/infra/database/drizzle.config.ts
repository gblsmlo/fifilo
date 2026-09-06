import { migrationEnv } from '@twincam/infra-env/migration'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: migrationEnv.DATABASE_MIGRATION_URL,
  },
})
