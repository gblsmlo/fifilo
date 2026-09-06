import type { CurrencyCode, EntityId } from '../primitives'

export type AccountKind = 'checking' | 'credit_card' | 'investment' | 'savings' | 'wallet'

/**
 * Fase 01 ships no per-workspace currency setting (Fase 06 § Configurar moeda
 * do workspace): every account is created in this one until that lands. The
 * route reads this constant instead of taking `currency` from the client, so
 * swapping it for a real per-workspace lookup later is a one-line change.
 */
export const DEFAULT_WORKSPACE_CURRENCY: CurrencyCode = 'BRL'

export type Account = {
  archivedAt: Date | null
  color: string | null
  createdAt: Date
  createdBy: EntityId
  currency: CurrencyCode
  icon: string | null
  id: EntityId
  institution: string | null
  kind: AccountKind
  name: string
  organizationId: string
  updatedAt: Date
  version: number
}

/**
 * An account name is compared without case or leading/trailing space
 * (Fase 01 § Modelagem): "Wallet" and " wallet " collide.
 */
export const normalizeAccountName = (name: string): string => name.trim()

export const accountNameKey = (name: string): string => normalizeAccountName(name).toLowerCase()

/**
 * An archived account keeps every entry it already has — it still counts in
 * historical balances — it just refuses a new one.
 */
export const canReceiveNewEntries = (account: Pick<Account, 'archivedAt'>): boolean =>
  account.archivedAt === null
