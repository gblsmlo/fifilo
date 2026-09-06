import { serverEnv } from '@twincam/infra-env/server'
import { logEvent } from '@twincam/observability/runtime'

import { createApp } from './app'
import { createOpenAPIPlugin } from './openapi'

export type { App } from './app'

const baseApp = createApp()

const app = (
  serverEnv.NODE_ENV === 'development' ? baseApp.use(createOpenAPIPlugin()) : baseApp
).listen(serverEnv.API_PORT)

logEvent({
  level: 'info',
  message: 'api.started',
  context: {
    hostname: app.server?.hostname ?? '0.0.0.0',
    port: app.server?.port ?? serverEnv.API_PORT,
    service: 'api',
  },
})
