import { expect, test } from '../helpers/app-test'

/**
 * The `chromium` project injects the seeded owner's session and organization
 * through `storageState` (playwright.config.ts), so this journey starts
 * already authenticated with an active workspace.
 */
test.describe('@accounts financial accounts', () => {
  test('creates an account, sees its balance, archives it and it disappears from the active list', async ({
    page,
  }) => {
    await page.goto('/accounts')

    const accountName = `E2E Checking ${Date.now()}`

    await page.getByLabel('Nome').fill(accountName)
    await page.getByRole('button', { name: 'Criar conta' }).click()

    const card = page.locator('[data-slot="card"]', { hasText: accountName })
    await expect(card).toBeVisible()
    await expect(card.getByText('R$')).toBeVisible()
    await expect(page.getByTestId('consolidated-balance')).toContainText('R$')

    await card.getByRole('button', { name: 'Arquivar' }).click()

    const dialog = page.getByRole('dialog', { name: 'Arquivar conta?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Arquivar' }).click()

    await expect(page.getByText(accountName)).toHaveCount(0)
  })
})
