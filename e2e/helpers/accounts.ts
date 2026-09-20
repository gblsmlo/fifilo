import type { Page } from '@playwright/test'

/**
 * Creating an account is a dialog on `/accounts`, not a form standing on the
 * page: the journeys that only need an account to exist go through here.
 */
export const createAccount = async (
  page: Page,
  account: { kind?: string; name: string },
): Promise<void> => {
  await page.getByRole('button', { name: 'Nova conta' }).click()

  const dialog = page.getByRole('dialog', { name: 'Nova conta' })
  await dialog.getByLabel('Nome').fill(account.name)

  if (account.kind) {
    await dialog.getByRole('combobox', { name: 'Tipo' }).click()
    await page.getByRole('option', { name: account.kind }).click()
  }

  await dialog.getByRole('button', { name: 'Criar conta' }).click()
}

/** The account's row in the collection list, named by the account itself. */
export const accountRow = (page: Page, name: string) => page.getByRole('article', { name })
