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

/**
 * `KEY=` in a `.env` file sets the variable to `''`, not to "absent" - a
 * plain `.optional()` would still reject that empty string against
 * `.min(1)`. Blank counts as "not configured" here so `.env.example` can
 * document an optional key as an empty line without breaking startup.
 */
const optionalSecret = () =>
  z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional())

export const serverEnvSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  APP_NAME: z.string().min(1).default('Fifilo'),
  APP_URL: originSchema,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().min(1),
  BETTER_AUTH_TRUSTED_ORIGINS: csvOriginsSchema,
  DATABASE_URL: z.string().min(1).startsWith('postgresql://'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Each optional individually (Fase 07 § "Dois provedores desde o início"):
  // an environment can run with only one provider configured. Neither
  // adapter is constructed unless the app actually wires it, so an absent
  // key never fails startup - it fails the one adapter that needed it, the
  // first time something asks for it.
  ANTHROPIC_API_KEY: optionalSecret(),
  OPENROUTER_API_KEY: optionalSecret(),
})

export const createServerEnv = (runtimeEnv: RuntimeEnv = readRuntimeEnv()) =>
  serverEnvSchema.parse(runtimeEnv)

export const serverEnv = createServerEnv()
export type ServerEnv = z.infer<typeof serverEnvSchema>
