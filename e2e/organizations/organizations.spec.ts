import { execFileSync } from 'node:child_process'
import { hashPassword } from 'better-auth/crypto'
import { expect, test } from '../helpers/app-test'

/**
 * The full Fase 04 journey: owner invites → invitee accepts → sees the
 * existing transactions (read-only) → cannot create one → owner promotes to
 * member → the same invitee can now create one.
 *
 * No email provider ships with the starter (the same limitation
 * `password-recovery.spec.ts` names), so the invitation id is read directly
 * from Postgres instead of a delivered link, and the invitee's account is
 * seeded the same way `db:seed` seeds the owner - through `psql` via
 * `docker compose exec`, not `@fifilo/infra-database`: that package's client
 * imports Bun's built-in `SQL`, which Playwright's Node worker process
 * cannot resolve. Both are this test's own substitute for infrastructure
 * the product does not have yet, not a shortcut around the authorization
 * the test exists to prove.
 */
const psql = (sql: string): string =>
  execFileSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'fifilo',
      '-d',
      'fifilo',
      '-t',
      '-A',
      '-c',
      sql,
    ],
    { encoding: 'utf8' },
  ).trim()

test.describe('@organizations viewer role and promotion', () => {
  test('a viewer invitee can read but not write, then can write once promoted to member', async ({
    browser,
    page,
  }) => {
    const stamp = Date.now()
    const invitedEmail = `e2e-invitee-${stamp}@fifilo.local`
    const invitedPassword = 'change-this-invitee-password'
    const accountName = `E2E Org Checking ${stamp}`
    const categoryName = `E2E Org Mercado ${stamp}`
    const expenseDescription = `E2E Org Supermercado ${stamp}`
    const blockedDescription = `E2E Org Blocked ${stamp}`
    const allowedDescription = `E2E Org Allowed ${stamp}`

    // The owner creates something for the invitee to read later.
    await page.goto('/accounts')
    await page.getByLabel('Nome').fill(accountName)
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.locator('[data-slot="card"]', { hasText: accountName })).toBeVisible()

    await page.goto('/categories')
    await page.getByLabel('Nome').fill(categoryName)
    await page.getByRole('button', { name: 'Criar categoria' }).click()
    await expect(page.locator('[data-slot="card-title"]', { hasText: categoryName })).toBeVisible()

    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Nova transação' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nova transação' })
    await dialog.getByLabel('Descrição').fill(expenseDescription)
    await dialog.getByLabel('Valor').fill('5000')
    await dialog.getByLabel('Conta').selectOption({ label: accountName })
    await dialog.getByLabel('Categoria').selectOption({ label: categoryName })
    await dialog.getByRole('button', { name: 'Registrar despesa' }).click()
    await expect(page.getByText(expenseDescription)).toBeVisible()

    // The owner invites as viewer.
    await page.goto('/organization')
    await page.getByLabel('Email').fill(invitedEmail)
    // Exact: a leftover member row from an earlier run has its own
    // `aria-label="Papel de <name>"`, which substring-matches "Papel" too.
    await page.getByLabel('Papel', { exact: true }).selectOption('viewer')
    await page.getByRole('button', { name: 'Enviar convite' }).click()
    await expect(page.getByText('Convite registrado para envio.')).toBeVisible()

    const invitationId = psql(
      `select id from invitations where email = '${invitedEmail}' and status = 'pending' order by expires_at desc limit 1;`,
    )
    if (!invitationId) throw new Error('The invitation row was not created.')

    // Seeding the invitee's own credential the same way `db:seed` seeds the
    // owner - the starter ships no email delivery to click a real link with.
    const invitedUserId = `e2e_invitee_${stamp}`
    const password = await hashPassword(invitedPassword)
    psql(
      `insert into users (id, name, email, email_verified, created_at, updated_at)
       values ('${invitedUserId}', 'E2E Invitee ${stamp}', '${invitedEmail}', true, now(), now());`,
    )
    psql(
      `insert into accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
       values ('${invitedUserId}_credential', '${invitedUserId}', 'credential', '${invitedUserId}', '${password}', now(), now());`,
    )

    const invitee = await browser.newContext()
    const inviteePage = await invitee.newPage()

    const signInResponse = await inviteePage.request.post('/api/auth/sign-in/email', {
      data: { email: invitedEmail, password: invitedPassword, rememberMe: true },
    })
    expect(signInResponse.ok()).toBe(true)

    // The accept-invitation page itself (its button, its client-side
    // navigation to `/dashboard`) is Fase 00 territory, already in place
    // before this phase and not what it changed; calling the same endpoint
    // `AcceptInvitationPage` calls, directly, keeps this journey's setup
    // fast and focused on what Fase 04 actually adds - the role check that
    // follows.
    const acceptResponse = await inviteePage.request.post(
      '/api/auth/organization/accept-invitation',
      { data: { invitationId } },
    )
    expect(acceptResponse.ok()).toBe(true)

    await inviteePage.goto('/dashboard')
    await expect(inviteePage.getByText(`E2E Invitee ${stamp}`)).toBeVisible()

    // Read access: the viewer sees the owner's transaction.
    await inviteePage.goto('/transactions')
    await expect(inviteePage.getByText(expenseDescription)).toBeVisible()

    // Write access denied: the same dialog, submitted, fails.
    await inviteePage.getByRole('button', { name: 'Nova transação' }).click()
    const inviteeDialog = inviteePage.getByRole('dialog', { name: 'Nova transação' })
    await inviteeDialog.getByLabel('Descrição').fill(blockedDescription)
    await inviteeDialog.getByLabel('Valor').fill('1000')
    await inviteeDialog.getByLabel('Conta').selectOption({ label: accountName })
    await inviteeDialog.getByLabel('Categoria').selectOption({ label: categoryName })
    await inviteeDialog.getByRole('button', { name: 'Registrar despesa' }).click()
    await expect(inviteePage.getByText('Falha ao registrar transação')).toBeVisible()
    await expect(inviteePage.getByText(blockedDescription)).toHaveCount(0)

    // The owner promotes the invitee to member.
    await page.goto('/organization')
    await page.getByLabel(`Papel de E2E Invitee ${stamp}`).selectOption('member')
    // `changeRole`'s own `loadMembers()` refetch is the confirmation the
    // request actually completed, not just that the select's value changed.
    await expect(page.getByLabel(`Papel de E2E Invitee ${stamp}`)).toHaveValue('member')

    // Now the same invitee can create one. A fresh navigation, not a
    // reload: `resolveSessionActorContext` reads `members.role` fresh on
    // every request regardless, and a full `goto` is the more reliable of
    // the two against a Vite dev server's own on-demand compilation.
    // `networkidle` waits out client hydration too - the button is server-
    // rendered and visible before its click handler is actually wired up.
    await inviteePage.goto('/transactions')
    await inviteePage.waitForLoadState('networkidle')
    await inviteePage.getByRole('button', { name: 'Nova transação' }).click()
    const promotedDialog = inviteePage.getByRole('dialog', { name: 'Nova transação' })
    await promotedDialog.getByLabel('Descrição').fill(allowedDescription)
    await promotedDialog.getByLabel('Valor').fill('1000')
    await promotedDialog.getByLabel('Conta').selectOption({ label: accountName })
    await promotedDialog.getByLabel('Categoria').selectOption({ label: categoryName })
    await promotedDialog.getByRole('button', { name: 'Registrar despesa' }).click()
    await expect(inviteePage.getByText(allowedDescription)).toBeVisible()

    await invitee.close()
  })
})
