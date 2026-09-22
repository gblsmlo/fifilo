import { type APIRequestContext, type Browser, expect } from '@playwright/test'

export type Workspace = {
  email: string
  organizationName: string
  ownerName: string
  storageStatePath: string
}

export type WorkspaceIdentity = Omit<Workspace, 'storageStatePath'>

const PASSWORD = 'workspace-fixture-2026'

/**
 * Signs a new owner up, signs them in and gives them an active organization,
 * leaving the session on `request`. Shared by the per-worker fixture and by the
 * warm-up in `global-setup.ts`, which needs a real session to reach the
 * authenticated routes at all.
 */
export const provisionWorkspace = async (
  request: APIRequestContext,
  label: string,
): Promise<WorkspaceIdentity> => {
  const stamp = `${Date.now()}-${label.replace(/\W+/g, '-').toLowerCase()}`
  const email = `e2e-${stamp}@fifilo.test`
  const ownerName = `E2E ${label}`
  const organizationName = `E2E Workspace ${stamp}`

  // The product's own route, not Better Auth's `/sign-up/email`: this one
  // provisions the credential already verified, and sign-in refuses an
  // unverified address.
  const signUp = await request.post('/api/auth/sign-up', {
    data: { email, name: ownerName, password: PASSWORD },
  })
  expect(signUp.ok(), `sign-up failed: ${await signUp.text()}`).toBe(true)

  const signIn = await request.post('/api/auth/sign-in/email', {
    data: { email, password: PASSWORD, rememberMe: true },
  })
  expect(signIn.ok(), `sign-in failed: ${await signIn.text()}`).toBe(true)

  const created = await request.post('/api/auth/organization/create', {
    data: { name: organizationName, slug: `e2e-workspace-${stamp}` },
  })
  expect(created.ok(), `organization create failed: ${await created.text()}`).toBe(true)

  // Without this the session has no active organization and every authenticated
  // route bounces back to the onboarding.
  const active = await request.post('/api/auth/organization/set-active', {
    data: { organizationId: (await created.json()).id as string },
  })
  expect(active.ok(), `set-active failed: ${await active.text()}`).toBe(true)

  return { email, organizationName, ownerName }
}

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
  const storageStatePath = `e2e/.auth/worker-${workerIndex}.json`

  // `browser.newContext()` inherits nothing from the project's `use`, so the
  // request context has no base to resolve a relative path against.
  const context = await browser.newContext({ baseURL })

  try {
    const identity = await provisionWorkspace(context.request, `Worker ${workerIndex}`)
    await context.storageState({ path: storageStatePath })
    return { ...identity, storageStatePath }
  } finally {
    await context.close()
  }
}
