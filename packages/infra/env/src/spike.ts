import { z } from 'zod'

import { type RuntimeEnv, readRuntimeEnv } from './runtime'

export const spikeEnvSchema = z.object({
  ALLOW_DESTRUCTIVE_SPIKES: z.enum(['true']).optional(),
})

export const createSpikeEnv = (runtimeEnv: RuntimeEnv = readRuntimeEnv()) =>
  spikeEnvSchema.parse(runtimeEnv)

export const spikeEnv = createSpikeEnv()
