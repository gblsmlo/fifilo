import type { HealthResponse } from '@twincam/core/contracts/health'

export const createHealthResponse = (): HealthResponse => ({
  status: 'ok',
  service: 'api',
  timestamp: new Date().toISOString(),
})
