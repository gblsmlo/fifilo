import { type Browser, expect } from '@playwright/test'

export type Workspace = {
  email: string
  organizationName: string
  ownerName: string
  storageStatePath: string
}

const PASSWORD = 'workspace-fixture-2026'

/**
 * A workspace of its own for each Playwright worker, signed in and active.
 *
 * Every spec used to act inside the single organization `db:seed` creates, so
 * two workers wrote to the same rows at once — `analytics` asserts a delta over
 * workspace-wide totals and a concurrent expense from another spec landed
 * inside its window (`BUG-004`). Row-level security already scopes every read
 * and write by workspace, so one workspace per worker makes parallelism correct
 * by construction rather than by luck.
 *
 * Per worker, not per spec: specs sharing a worker run serially, so they cannot
 * interleave, and one bootstrap per worker keeps the cost flat as the suite
 * grows.
 */
export const createWorkerWorkspace = async (
  browser: Browser,
  workerIndex: number,
  baseURL: string,
): Promise<Workspace> => {
  const stamp = `${Date.now()}-${workerIndex}`
  const email = `e2e-worker-${stamp}@fifilo.test`
  const ownerName = `E2E Worker ${workerIndex}`
  const organizationName = `E2E Workspace ${stamp}`
  const slug = `e2e-workspace-${stamp}`
  const storageStatePath = `e2e/.auth/worker-${workerIndex}.json`

  // `browser.newContext()` inherits nothing from the project's `use`, so the
  // request context has no base to resolve a relative path against.
  const context = await browser.newContext({ baseURL })

  try {
    // The product's own route, not Better Auth's `/sign-up/email`: this one
    // provisions the credential already verified, and sign-in refuses an
    // unverified address.
    const signUp = await context.request.post('/api/auth/sign-up', {
      data: { email, name: ownerName, password: PASSWORD },
    })
    expect(signUp.ok(), `sign-up failed: ${await signUp.text()}`).toBe(true)

    const signIn = await context.request.post('/api/auth/sign-in/email', {
      data: { email, password: PASSWORD, rememberMe: true },
    })
    expect(signIn.ok(), `sign-in failed: ${await signIn.text()}`).toBe(true)

    const created = await context.request.post('/api/auth/organization/create', {
      data: { name: organizationName, slug },
    })
    expect(created.ok(), `organization create failed: ${await created.text()}`).toBe(true)

    const organizationId = (await created.json()).id as string

    // Without this the session has no active organization and every
    // authenticated route bounces back to the onboarding.
    const active = await context.request.post('/api/auth/organization/set-active', {
      data: { organizationId },
    })
    expect(active.ok(), `set-active failed: ${await active.text()}`).toBe(true)

    await context.storageState({ path: storageStatePath })
  } finally {
    await context.close()
  }

  return { email, organizationName, ownerName, storageStatePath }
}
