import { z } from 'zod'

import type { RuntimeEnv } from './runtime'

export const clientEnvSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
  VITE_APP_NAME: z.string().min(1).default('Twincam'),
})

export const createClientEnv = (runtimeEnv: RuntimeEnv = import.meta.env as RuntimeEnv) =>
  clientEnvSchema.parse({
    VITE_APP_ENV: runtimeEnv.VITE_APP_ENV,
    VITE_APP_NAME: runtimeEnv.VITE_APP_NAME,
  })

export const clientEnv = createClientEnv()

export type ClientEnv = z.infer<typeof clientEnvSchema>
