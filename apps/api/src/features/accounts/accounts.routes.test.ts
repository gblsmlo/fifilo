import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createAccountRoutes } from './accounts.routes'
import { createFakeAccountRepository, createFakeEntryReader } from './accounts-test-support'

const actor: ActorResolution = {
  ok: true,
  context: {
    organizationId: 'org_a',
    organizationName: 'Org A',
    organizationSlug: 'org-a',
    role: 'owner',
    userId: 'user_1',
  },
}

const unauthenticated: ActorResolution = {
  ok: false,
  status: 401,
  code: 'unauthenticated',
  message: 'Authentication required.',
}

const request = (
  routes: ReturnType<typeof createAccountRoutes>,
  path: string,
  init?: RequestInit,
) => new Elysia().use(routes).handle(new Request(`http://localhost/api/accounts${path}`, init))

const jsonRequest = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
  method: 'POST',
})

describe('accounts routes', () => {
  test('GET / answers 401 without a session', async () => {
    const routes = createAccountRoutes({ resolveActor: async () => unauthenticated })
    const response = await request(routes, '')

    expect(response.status).toBe(401)
  })

  test('POST / creates an account and answers 201', async () => {
    const accountRepository = createFakeAccountRepository()
    const routes = createAccountRoutes({
      accountRepository,
      entryReader: createFakeEntryReader(),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '',
      jsonRequest({ kind: 'checking', name: 'Main checking' }),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as { name: string; organizationId: string }
    expect(body.name).toBe('Main checking')
    expect(body.organizationId).toBe('org_a')
  })

  test('POST / answers 409 for a name already used in the workspace', async () => {
    const accountRepository = createFakeAccountRepository()
    const routes = createAccountRoutes({ accountRepository, resolveActor: async () => actor })

    await request(routes, '', jsonRequest({ kind: 'checking', name: 'Main checking' }))
    const response = await request(
      routes,
      '',
      jsonRequest({ kind: 'wallet', name: 'main checking' }),
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: { code: 'account_name_taken', message: 'An account with this name already exists.' },
    })
  })

  test('POST / answers 400 when an opening balance has no date', async () => {
    const routes = createAccountRoutes({ resolveActor: async () => actor })

    const response = await request(
      routes,
      '',
      jsonRequest({ kind: 'wallet', name: 'Broken', openingBalanceMinor: 1000 }),
    )

    expect(response.status).toBe(400)
  })

  test('GET / lists only this workspace`s accounts', async () => {
    const mine = {
      archivedAt: null,
      color: null,
      createdAt: new Date(),
      createdBy: generateEntityId(),
      currency: 'BRL' as const,
      icon: null,
      id: generateEntityId(),
      institution: null,
      kind: 'checking' as const,
      name: 'Mine',
      organizationId: 'org_a',
      updatedAt: new Date(),
      version: 1,
    }
    const theirs = { ...mine, id: generateEntityId(), name: 'Theirs', organizationId: 'org_b' }
    const accountRepository = createFakeAccountRepository([mine, theirs])
    const routes = createAccountRoutes({ accountRepository, resolveActor: async () => actor })

    const response = await request(routes, '')

    expect(response.status).toBe(200)
    const body = (await response.json()) as Array<{ name: string }>
    expect(body.map((account) => account.name)).toEqual(['Mine'])
  })

  test('PATCH /:id answers 409 on a stale version', async () => {
    const account = {
      archivedAt: null,
      color: null,
      createdAt: new Date(),
      createdBy: generateEntityId(),
      currency: 'BRL' as const,
      icon: null,
      id: generateEntityId(),
      institution: null,
      kind: 'checking' as const,
      name: 'Checking',
      organizationId: 'org_a',
      updatedAt: new Date(),
      version: 1,
    }
    const accountRepository = createFakeAccountRepository([account])
    const routes = createAccountRoutes({ accountRepository, resolveActor: async () => actor })

    const response = await request(routes, `/${account.id}`, {
      ...jsonRequest({ version: 99, institution: 'Bank X' }),
      method: 'PATCH',
    })

    expect(response.status).toBe(409)
  })

  test('POST /:id/archive answers 404 for an unknown id', async () => {
    const routes = createAccountRoutes({ resolveActor: async () => actor })

    const response = await request(routes, `/${generateEntityId()}/archive`, { method: 'POST' })

    expect(response.status).toBe(404)
  })

  test('POST /:id/archive records an audit event on success (Fase 04 § Modelagem)', async () => {
    const account = {
      archivedAt: null,
      color: null,
      createdAt: new Date(),
      createdBy: generateEntityId(),
      currency: 'BRL' as const,
      icon: null,
      id: generateEntityId(),
      institution: null,
      kind: 'checking' as const,
      name: 'Checking',
      organizationId: 'org_a',
      updatedAt: new Date(),
      version: 1,
    }
    const accountRepository = createFakeAccountRepository([account])
    const events: unknown[] = []
    const routes = createAccountRoutes({
      accountRepository,
      auditEvent: (event) => events.push(event),
      resolveActor: async () => actor,
    })

    const response = await request(routes, `/${account.id}/archive`, { method: 'POST' })

    expect(response.status).toBe(200)
    expect(events).toEqual([
      {
        action: 'account.archived',
        actorId: 'user_1',
        actorType: 'user',
        entityId: account.id,
        entityType: 'financial_account',
        workspaceId: 'org_a',
      },
    ])
  })

  test('GET /balances reports the consolidated balance', async () => {
    const account = {
      archivedAt: null,
      color: null,
      createdAt: new Date(),
      createdBy: generateEntityId(),
      currency: 'BRL' as const,
      icon: null,
      id: generateEntityId(),
      institution: null,
      kind: 'checking' as const,
      name: 'Checking',
      organizationId: 'org_a',
      updatedAt: new Date(),
      version: 1,
    }
    const accountRepository = createFakeAccountRepository([account])
    const entryReader = createFakeEntryReader({ org_a: { [account.id]: 10_000 } })
    const routes = createAccountRoutes({
      accountRepository,
      entryReader,
      resolveActor: async () => actor,
    })

    const response = await request(routes, '/balances')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      accounts: [{ accountId: account.id, balance: { amountMinor: 10_000, currency: 'BRL' } }],
      consolidated: { amountMinor: 10_000, currency: 'BRL' },
    })
  })
})
