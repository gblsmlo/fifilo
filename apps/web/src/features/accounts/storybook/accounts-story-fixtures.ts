import type { AccountResponse } from '@fifilo/core/accounts'
import { generateEntityId } from '@fifilo/core/primitives'

/** Mock data for the Accounts stories. Server messages here, not product copy. */
export const accountsStoryFixtures = {
  nameTakenMessage: 'Já existe uma conta com este nome.',
  unreachableMessage: 'Não foi possível falar com o servidor. Tente novamente.',
} as const

export const buildStoryAccount = (overrides: Partial<AccountResponse> = {}): AccountResponse => ({
  archivedAt: null,
  color: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  currency: 'BRL',
  icon: null,
  id: generateEntityId(),
  institution: null,
  kind: 'checking',
  name: 'Conta corrente',
  organizationId: 'org_story',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  ...overrides,
})
