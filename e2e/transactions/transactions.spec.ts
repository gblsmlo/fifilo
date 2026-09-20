import { accountRow, createAccount } from '../helpers/accounts'
import { expect, test } from '../helpers/app-test'

/**
 * The full Fase 02 journey: a category, an expense against it, a transfer
 * between two accounts, both balances reflecting it, and the period filter
 * surviving a reload (Fase 02 § Critério de conclusão).
 */
test.describe('@transactions categories and transactions', () => {
  test('creates a category, registers an expense, transfers between accounts, checks both balances and filters by period', async ({
    page,
  }) => {
    const stamp = Date.now()
    const checkingName = `E2E Checking ${stamp}`
    const walletName = `E2E Wallet ${stamp}`
    const categoryName = `E2E Mercado ${stamp}`
    const expenseDescription = `E2E Supermercado ${stamp}`
    const transferDescription = `E2E Transferência ${stamp}`

    await page.goto('/accounts')
    await createAccount(page, { name: checkingName })
    await expect(accountRow(page, checkingName)).toBeVisible()

    await createAccount(page, { kind: 'Carteira', name: walletName })
    await expect(accountRow(page, walletName)).toBeVisible()

    await page.goto('/categories')
    await page.getByLabel('Nome').fill(categoryName)
    await page.getByRole('button', { name: 'Criar categoria' }).click()
    // The row, not the page text: the category just created is now also an
    // option in the "Nova categoria" parent select.
    await expect(page.getByRole('row', { name: categoryName })).toBeVisible()

    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Nova transação' }).click()

    const dialog = page.getByRole('dialog', { name: 'Nova transação' })
    await expect(dialog).toBeVisible()

    // Despesa is the dialog's default tab.
    await dialog.getByLabel('Descrição').fill(expenseDescription)
    await dialog.getByLabel('Valor').fill('5000')
    await dialog.getByLabel('Conta').click()
    await page.getByRole('option', { name: checkingName, exact: true }).click()
    await dialog.getByLabel('Categoria').click()
    await page.getByRole('option', { name: categoryName, exact: true }).click()
    await dialog.getByRole('button', { name: 'Registrar despesa' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText(expenseDescription)).toBeVisible()

    await page.getByRole('button', { name: 'Nova transação' }).click()
    await dialog.getByRole('tab', { name: 'Transferência' }).click()

    await dialog.getByLabel('Descrição').fill(transferDescription)
    await dialog.getByLabel('Valor').fill('2000')
    await dialog.getByLabel('Conta de origem').click()
    await page.getByRole('option', { name: checkingName, exact: true }).click()
    await dialog.getByLabel('Conta de destino').click()
    await page.getByRole('option', { name: walletName, exact: true }).click()
    await dialog.getByRole('button', { name: 'Transferir' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText(transferDescription)).toBeVisible()

    // R$ 50,00 expense + R$ 20,00 out on the checking account: -R$ 70,00.
    // R$ 20,00 in on the wallet.
    await page.goto('/accounts')
    const checkingRow = accountRow(page, checkingName)
    const walletRow = accountRow(page, walletName)
    await expect(checkingRow.getByText('70,00')).toBeVisible()
    await expect(walletRow.getByText('20,00')).toBeVisible()

    // The period filter: a range that excludes today hides both transactions;
    // reloading the page must keep showing the same (empty) range from the URL.
    await page.goto('/transactions')
    await expect(page.getByText(expenseDescription)).toBeVisible()

    // Every filter, the period included, hangs off the single view-settings
    // trigger; the period is a range calendar with presets.
    const pickLastYear = async () => {
      await page.getByRole('button', { name: /^Exibição/ }).click()
      await page.getByRole('menuitem', { name: 'Período' }).click()
      await page.getByRole('button', { name: 'Ano passado' }).click()
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
    }

    await pickLastYear()
    await expect(page.getByText('Nenhuma transação no período')).toBeVisible()
    await expect(page.getByText(expenseDescription)).toHaveCount(0)

    // The range is URL state: reloading reproduces the same (empty) period.
    const lastYear = new Date().getFullYear() - 1
    await expect(page).toHaveURL(new RegExp(`from=${lastYear}-01-01`))
    await expect(page).toHaveURL(new RegExp(`to=${lastYear}-12-31`))

    await page.reload()
    await expect(page.getByText('Nenhuma transação no período')).toBeVisible()
    await expect(page.getByText(expenseDescription)).toHaveCount(0)
  })
})
