import { openapi } from '@elysia/openapi'
import { serverEnv } from '@twincam/infra-env/server'
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
      ],
    },
    mapJsonSchema: {
      zod: (schema: z.ZodType) => z.toJSONSchema(schema),
    },
  })
