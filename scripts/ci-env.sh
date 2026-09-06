#!/bin/sh
set -e

# Writes the `.env` the runner does not have. The values are the same public
# placeholders as `.env.example`: the server env schema throws without them, and
# both `drizzle-kit` and the `--env-file` of the test scripts read this file.
cat > .env <<'ENVFILE'
NODE_ENV=test
API_PORT=3001
APP_NAME=Fifilo
APP_URL=http://localhost:3000
VITE_APP_ENV=development
VITE_APP_NAME=Fifilo
DATABASE_URL=postgresql://fifilo:fifilo@localhost:5432/fifilo
DATABASE_MIGRATION_URL=postgresql://fifilo:fifilo@localhost:5432/fifilo
DATABASE_POOL_MAX=5
BETTER_AUTH_SECRET=local-development-secret-change-me-123456
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001
ENVFILE
