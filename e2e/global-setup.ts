import { type FullConfig, request } from '@playwright/test'

import { provisionWorkspace } from './helpers/workspace'

/**
 * Compiles the app once before any test runs.
 *
 * `webServer.url` marks the dev server ready as soon as it answers, but Vite
 * compiles on demand: the first visitor to each route pays for it, and with
 * more than one worker several tests pay at once and lose the race against
 * their own timeouts (`BUG-004`). Measured on this suite: cold at two workers,
 * up to four failures in 2.8 minutes; warm, 15 of 15 in 30 seconds, three runs
 * in a row.
 *
 * The warm-up signs in first, because an anonymous request to an authenticated
 * route redirects before the route it exists to compile is ever rendered.
 * Sequential on purpose: the point is to let the compiler finish, not to
 * reproduce the contention this exists to avoid.
 */
const WARMUP_PATHS = [
  '/login',
  '/sign-up',
  '/forgotten-password',
  '/reset-password',
  '/dashboard',
  '/accounts',
  '/transactions',
  '/categories',
  '/organization',
  '/settings',
]

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL
  if (!baseURL) throw new Error('The project must define a baseURL.')

  const context = await request.newContext({ baseURL })

  try {
    await provisionWorkspace(context, 'Warmup')

    for (const path of WARMUP_PATHS) {
      await context.get(path, { failOnStatusCode: false })
    }
  } finally {
    await context.dispose()
  }
}
