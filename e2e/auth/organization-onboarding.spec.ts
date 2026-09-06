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

test.describe('@auth first access and organization creation', () => {
  test('a session without an organization lands on onboarding, not an empty app', async ({
    page,
  }) => {
    await signUpAndSignIn(page, uniqueEmail('first-access'))

    await expect(page).toHaveURL(/\/onboarding$/)
    await expect(page.getByText('Crie sua organização')).toBeVisible()
  })

  test('creates the organization, lands operating and does not offer onboarding again', async ({
    page,
  }) => {
    const slug = `e2e-onboarding-${crypto.randomUUID().slice(0, 8)}`

    await signUpAndSignIn(page, uniqueEmail('create-organization'))
    await expect(page).toHaveURL(/\/onboarding$/)

    await page.getByRole('textbox', { exact: true, name: 'Nome' }).fill('Organização E2E')
    await page.getByRole('textbox', { exact: true, name: 'Slug' }).fill(slug)
    await page.getByRole('button', { name: 'Criar organização' }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/painel de Organização E2E/)).toBeVisible()

    // Revisiting onboarding with an active organization goes back to the app.
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
