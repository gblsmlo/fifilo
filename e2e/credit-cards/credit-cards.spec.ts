import { expect, test } from '../helpers/app-test'

/**
 * The full Fase 03 journey: register a card, a 3-installment purchase,
 * closing the earliest invoice, paying it and checking both the paying
 * account's balance and the card's available limit (Fase 03 § Critério de
 * conclusão).
 */
test.describe('@credit-cards credit card and invoice', () => {
  test('registers a card, buys in 3 installments, closes and pays the first invoice, checks balance and limit', async ({
    page,
  }) => {
    const stamp = Date.now()
    const checkingName = `E2E Checking ${stamp}`
    const cardName = `E2E Card ${stamp}`
    const categoryName = `E2E Compras ${stamp}`
    const purchaseDescription = `E2E Notebook ${stamp}`
    const today = new Date().toISOString().slice(0, 10)

    await page.goto('/accounts')
    await page.getByLabel('Nome').fill(checkingName)
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.locator('[data-slot="card"]', { hasText: checkingName })).toBeVisible()

    await page.getByLabel('Nome').fill(cardName)
    await page.getByLabel('Tipo').selectOption('credit_card')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    const cardAccountRow = page.locator('[data-slot="card"]', { hasText: cardName })
    await expect(cardAccountRow).toBeVisible()

    await page.goto('/categories')
    await page.getByLabel('Nome').fill(categoryName)
    await page.getByRole('button', { name: 'Criar categoria' }).click()
    await expect(page.locator('[data-slot="card-title"]', { hasText: categoryName })).toBeVisible()

    await page.goto('/accounts')
    await page
      .locator('[data-slot="card"]', { hasText: cardName })
      .getByRole('link', { name: 'Gerenciar cartão' })
      .click()

    await page.getByLabel('Dia de fechamento').fill('28')
    await page.getByLabel('Dia de vencimento').fill('10')
    await page.getByLabel('Limite').fill('500000')
    await page.getByRole('button', { name: 'Cadastrar cartão' }).click()

    await expect(page.getByTestId('available-limit')).toBeVisible()

    await page.getByLabel('Descrição', { exact: true }).fill(purchaseDescription)
    await page.getByLabel('Categoria', { exact: true }).selectOption({ label: categoryName })
    await page.getByLabel('Valor total').fill('30000')
    await page.getByLabel('Número de parcelas').fill('3')
    await page.getByLabel('Data da compra').fill(today)

    await expect(page.getByTestId('installment-preview')).toBeVisible()

    await page.getByRole('button', { name: 'Registrar compra parcelada' }).click()

    // Three consecutive cycles, three invoice cards - each titled
    // "{periodStart} — {periodEnd}", the one pattern unique to an invoice
    // card on this page before any invoice is selected. The earliest cycle,
    // due soonest, is the last one the descending-by-period list renders.
    const invoiceCards = page.locator('[data-slot="card"]', { hasText: '—' })
    await expect(invoiceCards).toHaveCount(3)
    await invoiceCards.last().click()

    await expect(page.getByText(purchaseDescription)).toBeVisible()

    await page.getByRole('button', { name: 'Fechar fatura' }).click()
    await expect(page.getByRole('button', { name: 'Pagar fatura' })).toBeVisible()

    await page.getByLabel('Pagar com').selectOption({ label: checkingName })
    await page.getByRole('button', { name: 'Pagar fatura' }).click()

    await expect(page.getByTestId('available-limit')).toContainText('4.900,00')

    await page.goto('/accounts')
    await expect(page.locator('[data-slot="card"]', { hasText: checkingName })).toContainText(
      '100,00',
    )
  })
})
