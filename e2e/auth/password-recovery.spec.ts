import { expect, test } from '../helpers/app-test'
import { seedOwner } from '../helpers/auth'

test.use({ storageState: { cookies: [], origins: [] } })

/**
 * The full recovery journey, request a link, receive the token, change the
 * password, is not covered here and cannot be: the starter ships no email
 * provider, the request lands in the notification outbox and no token is
 * delivered. What is verifiable today is the frame of both routes and the one
 * branch of `/reset-password` that does not depend on a delivered token.
 */
test.describe('@auth password recovery', () => {
  test('carries the typed email from the login into the recovery request', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('textbox', { exact: true, name: 'Email' }).fill(seedOwner.email)
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click()

    await expect(page.getByRole('heading', { name: 'Recupere o acesso' })).toBeVisible()
    // The email travels in `?email=`: whoever already typed it does not retype.
    await expect(page.getByRole('textbox', { exact: true, name: 'Email' })).toHaveValue(
      seedOwner.email,
    )
  })

  test('refuses the reset link without a token and offers to request another', async ({ page }) => {
    await page.goto('/reset-password')

    await expect(page.getByRole('heading', { name: 'Link inválido' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Solicitar novamente' })).toBeVisible()
    // Without a token there is nothing to reset: the form must not be on screen.
    await expect(page.getByRole('textbox', { exact: true, name: 'Nova senha' })).toHaveCount(0)
  })
})
