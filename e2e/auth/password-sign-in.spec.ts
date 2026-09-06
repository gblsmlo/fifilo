import { expect, test } from '../helpers/app-test'
import { seedOwner } from '../helpers/auth'

/**
 * The `chromium` project injects the seeded owner session through `storageState`,
 * which is right for every test that needs to be logged in. Here the subject is
 * authentication itself, so the context starts empty: otherwise the login screen
 * redirects to the dashboard before the test touches the form.
 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('@auth password provider', () => {
  test('authenticates with a valid credential and opens the dashboard', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('textbox', { exact: true, name: 'Email' }).fill(seedOwner.email)
    await page.getByRole('textbox', { exact: true, name: 'Senha' }).fill(seedOwner.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // The real session is the subject: without a valid cookie the app returns to /login.
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(seedOwner.name)).toBeVisible()
  })

  test('keeps the user on the login when the server rejects the credential', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('textbox', { exact: true, name: 'Email' }).fill(seedOwner.email)
    await page.getByRole('textbox', { exact: true, name: 'Senha' }).fill('not-the-seed-password')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Falha ao entrar')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('reveals and hides the typed password without losing the value', async ({ page }) => {
    await page.goto('/login')

    const password = page.getByRole('textbox', { exact: true, name: 'Senha' })
    await password.fill(seedOwner.password)
    await expect(password).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Mostrar senha' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await expect(password).toHaveValue(seedOwner.password)

    await page.getByRole('button', { name: 'Ocultar senha' }).click()
    await expect(password).toHaveAttribute('type', 'password')
    await expect(password).toHaveValue(seedOwner.password)
  })

  test('links the login and the sign-up in both directions', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('link', { name: 'Crie uma' }).click()
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()

    await page.getByRole('link', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  })
})
