import { type DomainError, conflictError } from '../../errors'
import type { CurrencyCode, EntityId } from '../../primitives'
import { generateEntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { Account, AccountKind } from '../account'
import { accountNameKey, normalizeAccountName } from '../account'
import type { AccountRepository } from '../ports'

export type CreateAccountCommand = {
  color: string | null
  currency: CurrencyCode
  icon: string | null
  institution: string | null
  kind: AccountKind
  name: string
  openingBalanceDate: string | null
  openingBalanceMinor: number
  organizationId: string
  userId: EntityId
}

export type CreateAccountError = DomainError<'conflict', 'account_name_taken'>

export const createAccount = async (
  command: CreateAccountCommand,
  repository: AccountRepository,
): Promise<Result<Account, CreateAccountError>> => {
  const nameKey = accountNameKey(command.name)
  const existing = await repository.findByName(command.organizationId, nameKey)

  if (existing) {
    return err(conflictError('account_name_taken', 'An account with this name already exists.'))
  }

  const now = new Date()
  const account = {
    color: command.color,
    createdAt: now,
    createdBy: command.userId,
    currency: command.currency,
    icon: command.icon,
    id: generateEntityId(),
    institution: command.institution,
    kind: command.kind,
    name: normalizeAccountName(command.name),
    organizationId: command.organizationId,
  }

  const openingEntry =
    command.openingBalanceMinor !== 0 && command.openingBalanceDate
      ? {
          amountMinor: command.openingBalanceMinor,
          id: generateEntityId(),
          occurredOn: command.openingBalanceDate,
        }
      : null

  const created = await repository.create(account, openingEntry)

  // The database's own partial unique index is what actually enforces this
  // (Fase 01 § Riscos); the lookup above is the fast path, this is the race
  // the fast path cannot close (Decision 002: two layers may agree, one is
  // real enforcement).
  if (!created) {
    return err(conflictError('account_name_taken', 'An account with this name already exists.'))
  }

  return ok(created)
}
