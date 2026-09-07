import type { Page } from '@playwright/test'
import { expect, test } from '../helpers/app-test'

/**
 * Fase 06 § Modelagem: settings a workspace already depends on implicitly
 * (currency, timezone, month start) become explicit and editable here, plus
 * the viewer's own preferences and the CSV export.
 *
 * A fresh organization, not the shared seeded one: `transactions.spec.ts`
 * and `analytics.spec.ts` both navigate without an explicit `from`/`to` and
 * so rely on `resolveThisMonthRange`'s default window - changing the shared
 * organization's `timezone`/`monthStartDay` here would shift that window out
 * from under them while they run concurrently (Playwright's default worker
 * pool runs spec files in parallel even with `fullyParallel: false`).
 */
test.use({ storageState: { cookies: [], origins: [] } })

const uniqueEmail = (scenario: string) => `${scenario}-${crypto.randomUUID()}@fifilo.test`
const PASSWORD = 'settings-e2e-2026'

async function signUpAndCreateOrganization(page: Page, name: string): Promise<void> {
  const email = uniqueEmail('settings')
  const slug = `e2e-settings-${crypto.randomUUID().slice(0, 8)}`

  await page.goto('/sign-up')
  await page.getByRole('textbox', { exact: true, name: 'Nome' }).fill('Conta de teste')
  await page.getByRole('textbox', { exact: true, name: 'Email' }).fill(email)
  await page.getByRole('textbox', { exact: true, name: 'Senha' }).fill(PASSWORD)
  await page.getByRole('textbox', { exact: true, name: 'Confirmar senha' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('textbox', { exact: true, name: 'Senha' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByRole('textbox', { exact: true, name: 'Nome' }).fill(name)
  await page.getByRole('textbox', { exact: true, name: 'Slug' }).fill(slug)
  await page.getByRole('button', { name: 'Criar organização' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe('@settings workspace and preferences', () => {
  test('saves workspace settings, saves user preferences and applies the theme, and exports a CSV', async ({
    page,
  }) => {
    await signUpAndCreateOrganization(page, 'Organização Settings E2E')

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()

    // Workspace settings: the account that just created the organization is
    // its owner, so every control here is enabled. A value distinct enough
    // from the default to prove it round-tripped, not just that the form
    // re-rendered its own input.
    await page.getByLabel('Fuso horário').fill('America/Recife')
    await page.getByLabel('Início do mês financeiro').fill('15')
    await page.getByRole('button', { name: 'Salvar configurações' }).click()
    await expect(page.getByText('Configurações salvas')).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Fuso horário')).toHaveValue('America/Recife')
    await expect(page.getByLabel('Início do mês financeiro')).toHaveValue('15')

    // User preferences: dark applies immediately (AppLayout's own effect),
    // not only after a reload.
    await page.getByRole('combobox', { name: 'Tema' }).click()
    await page.getByRole('option', { name: 'Escuro' }).click()
    await page.getByRole('button', { name: 'Salvar preferências' }).click()
    await expect(page.getByText('Preferências salvas')).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Export: owner-only section (Fase 06 § Modelagem), a real file save
    // triggered by the button, not just a 200 from the endpoint.
    const from = '2100-01-01'
    const to = '2100-01-31'
    await page.getByLabel('De', { exact: true }).fill(from)
    await page.getByLabel('Até', { exact: true }).fill(to)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toBe(`fifilo-${from}-a-${to}.csv`)
    await expect(page.getByText('Exportação concluída')).toBeVisible()
  })
})
