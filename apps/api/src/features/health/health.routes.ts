import type { HealthResponse } from '@fifilo/core/contracts/health'

export const createHealthResponse = (): HealthResponse => ({
  status: 'ok',
  service: 'api',
  timestamp: new Date().toISOString(),
})
