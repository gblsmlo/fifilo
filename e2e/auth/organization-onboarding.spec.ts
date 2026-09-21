import type { Page } from '@playwright/test'

import { expect, test } from '../helpers/app-test'

/**
 * First-access journey. The `chromium` project injects the seeded owner, who
 * already belongs to an organization, the opposite of what this suite needs.
 * Every test starts from a new, empty account.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const uniqueEmail = (scenario: string) => `${scenario}-${crypto.randomUUID()}@fifilo.test`
const PASSWORD = 'onboarding-e2e-2026'

async function signUpAndSignIn(page: Page, email: string) {
  await page.goto('/sign-up')
  await page.getByRole('textbox', { exact: true, name: 'Nome' }).fill('Conta de teste')
  await page.getByRole('textbox', { exact: true, name: 'Email' }).fill(email)
  await page.getByRole('textbox', { exact: true, name: 'Senha' }).fill(PASSWORD)
  await page.getByRole('textbox', { exact: true, name: 'Confirmar senha' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Criar conta' }).click()

  // Sign-up opens no session: the form returns to the login with the email
  // filled in, and the guard resolves the destination on the login success.
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('textbox', { exact: true, name: 'Senha' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

async function createOrganization(page: Page, scenario: string) {
  await signUpAndSignIn(page, uniqueEmail(scenario))
  await expect(page).toHaveURL(/\/onboarding$/)
  // The address is derived from the name and only surfaces on a conflict.
  await page
    .getByRole('textbox', { exact: true, name: 'Nome' })
    .fill(`Organização E2E ${crypto.randomUUID().slice(0, 8)}`)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(/\/onboarding\/setup$/)
}

test.describe('@auth first access and organization creation', () => {
  test('a session without an organization lands on onboarding, not an empty app', async ({
    page,
  }) => {
    await signUpAndSignIn(page, uniqueEmail('first-access'))

    await expect(page).toHaveURL(/\/onboarding$/)
    await expect(page.getByText('Como vamos chamar seu workspace?')).toBeVisible()
    await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Alternar sidebar' })).toHaveCount(0)
  })

  test('creates the organization, completes financial setup, and reaches the dashboard', async ({
    page,
  }) => {
    await createOrganization(page, 'complete-setup')
    // The region arrives detected; this journey takes the long way to prove
    // the three fields still exist behind it.
    await page.getByRole('button', { name: 'Alterar' }).click()
    await page.getByRole('combobox', { name: 'Moeda' }).click()
    await page.getByRole('option', { name: 'Dólar americano (USD)' }).click()
    await page.getByRole('combobox', { name: 'Idioma e formato' }).click()
    await page.getByRole('option', { name: 'Português (Brasil)' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Onde está seu dinheiro hoje?')).toBeVisible()
    await page.getByLabel('Nome').fill('Conta principal')
    await page.getByRole('combobox', { name: 'Tipo' }).click()
    await page.getByRole('option', { name: 'Conta corrente' }).click()
    await page.getByLabel('Instituição (opcional)').fill('Banco E2E')
    // Cleared first: the field starts at 0,00 and typing lands at the cursor,
    // so appending to it would build a different number.
    await page.getByLabel('Saldo hoje').fill('')
    await page.getByLabel('Saldo hoje').pressSequentially('428000')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    // The setup ends on the person's own money, which is the whole point of
    // asking for the opening balance a step earlier.
    // The currency was switched to USD a few steps above, so the symbol is not
    // what this asserts — the amount is.
    await expect(page.getByText(/Seu saldo: .*4\.280,00/)).toBeVisible()
    await page.getByRole('link', { name: 'Ir para o painel' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/painel de Organização E2E/)).toBeVisible()
    await expect(page.getByText('Falta pouco para o painel fazer sentido')).toHaveCount(0)

    // Revisiting onboarding with an active organization goes back to the app.
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/dashboard/)

    // The default set was seeded on the way through the setup, so the first
    // entry has something to classify.
    await page.goto('/categories')
    await expect(page.getByRole('row', { name: 'Alimentação' })).toBeVisible()
    await expect(page.getByRole('row', { name: 'Salário' })).toBeVisible()
  })

  test('skipping persists and resumes at the unfinished settings step', async ({ page }) => {
    await createOrganization(page, 'skip-setup')
    await page.getByRole('button', { name: 'Faço isso depois' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Falta pouco para o painel fazer sentido')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Falta pouco para o painel fazer sentido')).toBeVisible()
    await page.getByRole('link', { name: 'Continuar' }).click()
    await expect(page).toHaveURL(/\/onboarding\/setup$/)
    await expect(page.getByText('Confirme sua região')).toBeVisible()

    // The seeding runs on every entry to the setup, so coming back through the
    // reminder repairs a workspace that skipped straight past it.
    await page.goto('/categories')
    await expect(page.getByRole('row', { name: 'Alimentação' })).toBeVisible()
  })
})
