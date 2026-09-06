import { type Page, expect } from '@playwright/test'

/** The owner created by `bun run db:seed`, already a member of the seeded organization. */
export const seedOwner = {
  email: process.env.E2E_OWNER_EMAIL ?? 'owner@fifilo.local',
  id: 'seed_owner',
  name: 'Demo Owner',
  organizationName: 'Fifilo Demo',
  password: process.env.E2E_OWNER_PASSWORD ?? 'change-this-owner-password',
}

export async function signInAsSeedOwner(page: Page) {
  const response = await page.request.post('/api/auth/sign-in/email', {
    data: {
      email: seedOwner.email,
      password: seedOwner.password,
      rememberMe: true,
    },
  })

  expect(response.ok()).toBe(true)

  // The root resolves the authenticated destination; asserting an observable
  // success state before writing the storage state keeps a failed login from
  // being recorded as an empty session.
  await page.goto('/')
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByText(seedOwner.name)).toBeVisible()
}
