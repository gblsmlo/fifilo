import { openapi } from '@elysia/openapi'
import { serverEnv } from '@fifilo/infra-env/server'
import { z } from 'zod'

export const OPENAPI_REFERENCE_PATH = '/openapi'
export const OPENAPI_DOCUMENT_PATH = `${OPENAPI_REFERENCE_PATH}/json`

/**
 * Whether the reference exists is decided by `server.ts`, which mounts this
 * plugin only in development. This module decides only how it is served.
 */
export const createOpenAPIPlugin = () =>
  openapi({
    path: OPENAPI_REFERENCE_PATH,
    specPath: OPENAPI_DOCUMENT_PATH,
    provider: 'scalar',
    documentation: {
      info: {
        title: serverEnv.APP_NAME,
        description: 'Internal API reference. Served in development only.',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${serverEnv.API_PORT}`, description: 'Local' }],
      tags: [
        { name: 'Health', description: 'Service status' },
        { name: 'Auth', description: 'Sign-up and session' },
        { name: 'Users', description: 'Authenticated user' },
        { name: 'Accounts', description: 'Financial accounts and balances' },
        { name: 'Categories', description: 'Transaction categories' },
        { name: 'Transactions', description: 'Income, expenses and transfers' },
        { name: 'Credit cards', description: 'Cards, installments and invoices' },
        { name: 'Analytics', description: 'Dashboard projections' },
        { name: 'Settings', description: 'Workspace settings and user preferences' },
        { name: 'Export', description: 'Workspace data export' },
      ],
    },
    mapJsonSchema: {
      zod: (schema: z.ZodType) => z.toJSONSchema(schema),
    },
  })
