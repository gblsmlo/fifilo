import type { Page } from '@playwright/test'
import { expect, test } from '../helpers/app-test'

/**
 * "Disponível em caixa" and "Comprometido em fatura" are running balances as
 * of a date (Fase 05 § Modelagem), not a sum scoped to the dashboard's
 * period - so in a shared, never-cleaned database they carry every other
 * spec's history too. The only thing this test can hand-verify is the
 * *delta* its own transactions add, not the absolute figure.
 *
 * Read straight from the API `page.request` shares the session with, not
 * the rendered card: a `TrendLineChart`/`RankedBarChart` neighbor on the
 * same dashboard can still be mid-render when this fires, and a card whose
 * own query has not resolved yet reads back as its loading skeleton, not a
 * number - the API response has no such transient state.
 */
const readConsolidatedBalance = async (
  page: Page,
  asOf: string,
): Promise<{ availableCashMinor: number; committedInvoiceMinor: number }> => {
  const response = await page.request.get(`/api/analytics/consolidated-balance?asOf=${asOf}`)
  return response.json()
}

/**
 * Fase 05 § Critério de conclusão: seed three months of movement, open the
 * dashboard, check the numbers by hand. The period's year is derived from
 * this run's own timestamp, not a fixed constant: a fixed year would
 * accumulate a duplicate every time the suite reruns (nothing here deletes
 * old E2E rows), the same class of defect Fase 04's own session found in
 * the shared seed organization.
 */
test.describe('@analytics dashboard', () => {
  test('shows monthly cashflow, category and account spend, consolidated balance and top expenses for a three-month period', async ({
    page,
  }) => {
    const stamp = Date.now()
    // A year far from "today" and from every other spec's fixed dates
    // (2020's exclusion tests, "today"-relative defaults), and unique to
    // this run so a rerun never lands in the same period twice.
    const year = 2100 + (stamp % 500)
    const checkingName = `E2E Dashboard Checking ${stamp}`
    const categoryName = `E2E Dashboard Mercado ${stamp}`
    const incomeCategoryName = `E2E Dashboard Salário ${stamp}`

    await page.goto('/accounts')
    await page.getByLabel('Nome').fill(checkingName)
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.locator('[data-slot="card"]', { hasText: checkingName })).toBeVisible()

    await page.goto('/categories')
    await page.getByLabel('Nome').fill(categoryName)
    await page.getByRole('button', { name: 'Criar categoria' }).click()
    await expect(page.locator('[data-slot="card-title"]', { hasText: categoryName })).toBeVisible()

    // Decision 022: a category has a fixed kind, so income needs its own
    // category - it cannot reuse the expense one above.
    await page.getByLabel('Nome').fill(incomeCategoryName)
    await page.getByLabel('Tipo').selectOption('income')
    await page.getByRole('button', { name: 'Criar categoria' }).click()
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: incomeCategoryName }),
    ).toBeVisible()

    // Read the baseline before any of this run's transactions exist: the
    // new, empty account contributes zero, so this is the shared org's
    // accumulated history up to this far-future date - not a number this
    // test controls, but a fixed point its own delta can be checked against.
    const baseline = await readConsolidatedBalance(page, `${year}-03-31`)

    await page.goto('/transactions')
    const dialog = page.getByRole('dialog', { name: 'Nova transação' })

    const registerIncome = async (occurredOn: string, amountMinor: string) => {
      await page.getByRole('button', { name: 'Nova transação' }).click()
      await expect(dialog).toBeVisible()
      await dialog.getByRole('tab', { name: 'Receita' }).click()
      await dialog.getByLabel('Descrição').fill(`E2E Receita ${stamp} ${occurredOn}`)
      await dialog.getByLabel('Valor').fill(amountMinor)
      await dialog.getByLabel('Conta').selectOption({ label: checkingName })
      await dialog.getByLabel('Categoria').selectOption({ label: incomeCategoryName })
      await dialog.getByLabel('Data').fill(occurredOn)
      await dialog.getByRole('button', { name: 'Registrar receita' }).click()
      await expect(dialog).toBeHidden()
    }

    const registerExpense = async (occurredOn: string, amountMinor: string) => {
      await page.getByRole('button', { name: 'Nova transação' }).click()
      await expect(dialog).toBeVisible()
      // Despesa is only the *first ever* open's default tab - the dialog
      // never unmounts between opens, so a prior `registerIncome` call
      // leaves its tab selected the next time this one opens.
      await dialog.getByRole('tab', { name: 'Despesa' }).click()
      await dialog.getByLabel('Descrição').fill(`E2E Despesa ${stamp} ${occurredOn}`)
      await dialog.getByLabel('Valor').fill(amountMinor)
      await dialog.getByLabel('Conta').selectOption({ label: checkingName })
      await dialog.getByLabel('Categoria').selectOption({ label: categoryName })
      await dialog.getByLabel('Data').fill(occurredOn)
      await dialog.getByRole('button', { name: 'Registrar despesa' }).click()
      await expect(dialog).toBeHidden()
    }

    // R$ 1.000,00 de receita e uma despesa própria em cada um dos três
    // meses - valores diferentes por mês para que "maiores gastos" tenha
    // uma ordem inequívoca de conferir.
    await registerIncome(`${year}-01-05`, '100000')
    await registerExpense(`${year}-01-10`, '30000')
    await registerIncome(`${year}-02-05`, '100000')
    await registerExpense(`${year}-02-10`, '40000')
    await registerIncome(`${year}-03-05`, '100000')
    await registerExpense(`${year}-03-10`, '20000')

    await page.goto(`/dashboard?from=${year}-01-01&to=${year}-03-31`)

    // Fluxo mensal: receita e despesa por mês, a tabela acessível por trás
    // do gráfico (Fase 05 § Web).
    await expect(
      page.getByRole('row', { name: new RegExp(`${year}-01.*1\\.000,00.*300,00`) }),
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(`${year}-02.*1\\.000,00.*400,00`) }),
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(`${year}-03.*1\\.000,00.*200,00`) }),
    ).toBeVisible()

    // Gasto por categoria: as três despesas somadas em "Mercado" -
    // R$ 300,00 + R$ 400,00 + R$ 200,00.
    await expect(
      page.getByRole('row', { name: new RegExp(`${categoryName}.*900,00`) }),
    ).toBeVisible()

    // Gasto por conta: a mesma soma, agora por conta em vez de categoria.
    await expect(
      page.getByRole('row', { name: new RegExp(`${checkingName}.*900,00`) }),
    ).toBeVisible()

    // Saldo consolidado: R$ 3.000,00 de receita menos R$ 900,00 de despesa
    // sobre a base já existente antes desta jornada - a soma exata só é
    // conferível como delta (ver o comentário de `readConsolidatedBalance`).
    // Nenhum cartão nesta jornada, então "comprometido em fatura" não muda.
    const final = await readConsolidatedBalance(page, `${year}-03-31`)
    expect(final.availableCashMinor - baseline.availableCashMinor).toBe(210_000)
    expect(final.committedInvoiceMinor).toBe(baseline.committedInvoiceMinor)

    // A mesma cifra também aparece no card que a dashboard renderiza -
    // prova de que a UI está de fato ligada ao mesmo endpoint, não só o
    // endpoint em si.
    await expect(
      page.locator('[data-slot="card"]', { hasText: 'Disponível em caixa' }),
    ).toBeVisible()

    // Maiores gastos: a maior despesa (fevereiro, R$ 400,00) primeiro.
    const topExpensesCard = page.locator('[data-slot="card"]', { hasText: 'Maiores gastos' })
    await expect(topExpensesCard).toBeVisible()
    await expect(topExpensesCard.locator('tbody tr').first()).toContainText('400,00')
  })
})
