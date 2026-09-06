import { test as setup } from '@playwright/test'

import { signInAsSeedOwner } from './helpers/auth'

setup('authenticate seeded owner', async ({ page }) => {
  await signInAsSeedOwner(page)
  await page.context().storageState({ path: 'e2e/.auth/seed-owner.json' })
})
