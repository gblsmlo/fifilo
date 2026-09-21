import type { Page } from '@playwright/test'

/**
 * Creating an account is a dialog on `/accounts`, not a form standing on the
 * page: the journeys that only need an account to exist go through here.
 */
export const createAccount = async (
  page: Page,
  account: { kind?: string; name: string; openingBalanceDigits?: string },
): Promise<void> => {
  await page.getByRole('button', { name: 'Nova conta' }).click()

  const dialog = page.getByRole('dialog', { name: 'Nova conta' })
  await dialog.getByLabel('Nome').fill(account.name)

  if (account.kind) {
    await dialog.getByRole('combobox', { name: 'Tipo' }).click()
    await page.getByRole('option', { name: account.kind }).click()
  }

  // Digits, not a formatted amount: the field edits the integer in minor
  // units and reformats the display from it (Decision 017), so "428000" is
  // what a person types to mean R$ 4.280,00.
  if (account.openingBalanceDigits) {
    await dialog.getByLabel('Saldo hoje').fill('')
    await dialog.getByLabel('Saldo hoje').pressSequentially(account.openingBalanceDigits)
  }

  await dialog.getByRole('button', { name: 'Criar conta' }).click()
}

/** The account's row in the collection list, named by the account itself. */
export const accountRow = (page: Page, name: string) => page.getByRole('article', { name })
