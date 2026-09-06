import { z } from 'zod'

import { type RuntimeEnv, readRuntimeEnv } from './runtime'

const originSchema = z
  .url()
  .refine(
    (value) => {
      const url = new URL(value)
      return url.pathname === '/' && url.search === '' && url.hash === ''
    },
    { message: 'Expected an origin without path, query, or hash.' },
  )
  .transform((value) => new URL(value).origin)

const csvOriginsSchema = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(originSchema).default([]),
)

export const serverEnvSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  APP_NAME: z.string().min(1).default('Twincam'),
  APP_URL: originSchema,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().min(1),
  BETTER_AUTH_TRUSTED_ORIGINS: csvOriginsSchema,
  DATABASE_URL: z.string().min(1).startsWith('postgresql://'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export const createServerEnv = (runtimeEnv: RuntimeEnv = readRuntimeEnv()) =>
  serverEnvSchema.parse(runtimeEnv)

export const serverEnv = createServerEnv()
export type ServerEnv = z.infer<typeof serverEnvSchema>
