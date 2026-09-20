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
  const slug = `e2e-onboarding-${crypto.randomUUID().slice(0, 8)}`
  await page.getByRole('textbox', { exact: true, name: 'Nome' }).fill('Organização E2E')
  await page.getByRole('textbox', { exact: true, name: 'Slug' }).fill(slug)
  await page.getByRole('button', { name: 'Criar organização' }).click()
  await expect(page).toHaveURL(/\/onboarding\/setup$/)
}

test.describe('@auth first access and organization creation', () => {
  test('a session without an organization lands on onboarding, not an empty app', async ({
    page,
  }) => {
    await signUpAndSignIn(page, uniqueEmail('first-access'))

    await expect(page).toHaveURL(/\/onboarding$/)
    await expect(page.getByText('Crie sua organização')).toBeVisible()
    await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Alternar sidebar' })).toHaveCount(0)
  })

  test('creates the organization, completes financial setup, and reaches the dashboard', async ({
    page,
  }) => {
    await createOrganization(page, 'complete-setup')
    await page.getByRole('combobox', { name: 'Moeda' }).click()
    await page.getByRole('option', { name: 'Dólar americano (USD)' }).click()
    await page.getByLabel('Idioma e formato').fill('pt-BR')
    await page.getByLabel('Fuso horário').fill('America/Sao_Paulo')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Crie sua primeira conta')).toBeVisible()
    await page.getByLabel('Nome').fill('Conta principal')
    await page.getByRole('combobox', { name: 'Tipo' }).click()
    await page.getByRole('option', { name: 'Conta corrente' }).click()
    await page.getByLabel('Instituição (opcional)').fill('Banco E2E')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('Configuração concluída')).toBeVisible()
    await page.getByRole('link', { name: 'Ir para o painel' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/painel de Organização E2E/)).toBeVisible()
    await expect(page.getByText('Finalize sua configuração financeira')).toHaveCount(0)

    // Revisiting onboarding with an active organization goes back to the app.
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('skipping persists and resumes at the unfinished settings step', async ({ page }) => {
    await createOrganization(page, 'skip-setup')
    await page.getByRole('button', { name: 'Pular por agora' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Finalize sua configuração financeira')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Finalize sua configuração financeira')).toBeVisible()
    await page.getByRole('link', { name: 'Continuar' }).click()
    await expect(page).toHaveURL(/\/onboarding\/setup$/)
    await expect(page.getByText('Configure seu workspace')).toBeVisible()
  })
})
