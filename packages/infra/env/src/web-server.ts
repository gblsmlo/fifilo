import { z } from 'zod'

import { type RuntimeEnv, readRuntimeEnv } from './runtime'

const apiBaseUrlSchema = z
  .preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .url()
      .optional()
      .refine(
        (value) => {
          if (!value) return true

          const url = new URL(value)
          return (
            (url.protocol === 'http:' || url.protocol === 'https:') &&
            url.pathname === '/' &&
            url.search === '' &&
            url.hash === ''
          )
        },
        { message: 'Expected an HTTP origin without path, query, or hash.' },
      ),
  )
  .transform((value) => (value ? new URL(value).origin : undefined))

export const webServerEnvSchema = z.object({
  API_BASE_URL: apiBaseUrlSchema,
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
})

export const createWebServerEnv = (runtimeEnv: RuntimeEnv = readRuntimeEnv()) =>
  webServerEnvSchema.parse(runtimeEnv)

export type WebServerEnv = z.infer<typeof webServerEnvSchema>
