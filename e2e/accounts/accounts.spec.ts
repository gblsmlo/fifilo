import { accountRow, createAccount } from '../helpers/accounts'
import { expect, test } from '../helpers/app-test'

/**
 * The `chromium` project injects the seeded owner's session and organization
 * through `storageState` (playwright.config.ts), so this journey starts
 * already authenticated with an active workspace.
 */
test.describe('@accounts financial accounts', () => {
  test('creates an account, sees its balance, renames it, archives it and it disappears from the active list', async ({
    page,
  }) => {
    await page.goto('/accounts')

    const accountName = `E2E Checking ${Date.now()}`

    await createAccount(page, { name: accountName })

    const row = accountRow(page, accountName)
    await expect(row).toBeVisible()
    await expect(row.getByText('R$')).toBeVisible()
    await expect(page.getByTestId('consolidated-balance')).toContainText('R$')

    // Everything the row can do lives behind its actions menu.
    await row.getByRole('button', { name: `Ações da conta ${accountName}` }).click()
    await page.getByRole('menuitem', { name: 'Editar' }).click()

    const editDialog = page.getByRole('dialog', { name: 'Editar conta' })
    await editDialog.getByLabel('Nome').fill(`${accountName} renomeada`)
    await editDialog.getByRole('button', { name: 'Salvar' }).click()

    const renamed = accountRow(page, `${accountName} renomeada`)
    await expect(renamed).toBeVisible()

    await renamed.getByRole('button', { name: `Ações da conta ${accountName} renomeada` }).click()
    await page.getByRole('menuitem', { name: 'Arquivar' }).click()

    const dialog = page.getByRole('dialog', { name: 'Arquivar conta?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Arquivar' }).click()

    await expect(page.getByText(`${accountName} renomeada`)).toHaveCount(0)
  })
})
