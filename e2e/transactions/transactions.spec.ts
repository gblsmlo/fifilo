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
    await page.getByLabel('Nome').fill(checkingName)
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.locator('[data-slot="card"]', { hasText: checkingName })).toBeVisible()

    await page.getByLabel('Nome').fill(walletName)
    await page.getByLabel('Tipo').selectOption('wallet')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.locator('[data-slot="card"]', { hasText: walletName })).toBeVisible()

    await page.goto('/categories')
    await page.getByLabel('Nome').fill(categoryName)
    await page.getByRole('button', { name: 'Criar categoria' }).click()
    // `[data-slot="card"]` alone would also match the "Nova categoria" card:
    // the category just created is now an option in its own parent select.
    await expect(page.locator('[data-slot="card-title"]', { hasText: categoryName })).toBeVisible()

    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Nova transação' }).click()

    const dialog = page.getByRole('dialog', { name: 'Nova transação' })
    await expect(dialog).toBeVisible()

    // Despesa is the dialog's default tab.
    await dialog.getByLabel('Descrição').fill(expenseDescription)
    await dialog.getByLabel('Valor').fill('5000')
    await dialog.getByLabel('Conta').selectOption({ label: checkingName })
    await dialog.getByLabel('Categoria').selectOption({ label: categoryName })
    await dialog.getByRole('button', { name: 'Registrar despesa' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText(expenseDescription)).toBeVisible()

    await page.getByRole('button', { name: 'Nova transação' }).click()
    await dialog.getByRole('tab', { name: 'Transferência' }).click()

    await dialog.getByLabel('Descrição').fill(transferDescription)
    await dialog.getByLabel('Valor').fill('2000')
    await dialog.getByLabel('Conta de origem').selectOption({ label: checkingName })
    await dialog.getByLabel('Conta de destino').selectOption({ label: walletName })
    await dialog.getByRole('button', { name: 'Transferir' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText(transferDescription)).toBeVisible()

    // R$ 50,00 expense + R$ 20,00 out on the checking account: -R$ 70,00.
    // R$ 20,00 in on the wallet.
    await page.goto('/accounts')
    const checkingCard = page.locator('[data-slot="card"]', { hasText: checkingName })
    const walletCard = page.locator('[data-slot="card"]', { hasText: walletName })
    await expect(checkingCard.getByText('70,00')).toBeVisible()
    await expect(walletCard.getByText('20,00')).toBeVisible()

    // The period filter: a range that excludes today hides both transactions;
    // reloading the page must keep showing the same (empty) range from the URL.
    await page.goto('/transactions')
    await expect(page.getByText(expenseDescription)).toBeVisible()

    // Exact match: "De" and "Até" are short enough to otherwise substring-match
    // unrelated labels (implicit <label> wrapping folds descendant option text
    // into the accessible name too - "Despesa" contains "De", "sidebar" "de").
    await page.getByLabel('De', { exact: true }).fill('2020-01-01')
    await page.getByLabel('Até', { exact: true }).fill('2020-01-31')
    await expect(page.getByText('Nenhuma transação no período')).toBeVisible()
    await expect(page.getByText(expenseDescription)).toHaveCount(0)

    await page.reload()
    await expect(page.getByLabel('De', { exact: true })).toHaveValue('2020-01-01')
    await expect(page.getByLabel('Até', { exact: true })).toHaveValue('2020-01-31')
    await expect(page.getByText('Nenhuma transação no período')).toBeVisible()
  })
})
