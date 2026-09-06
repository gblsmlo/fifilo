import {
  type AccessControlError,
  type WorkspaceRole,
  requireFinancialWriteAccess,
} from '../../access-control'
import { type DomainError, conflictError, notFoundError, validationError } from '../../errors'
import type { CurrencyCode, EntityId } from '../../primitives'
import { generateEntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { AccountLookup, CategoryLookup, TransactionRepository } from '../ports'
import type { Transaction } from '../transaction'
import { deriveLegs } from '../transaction'

export type CreateTransactionCommand =
  | {
      accountId: EntityId
      amountMinor: number
      categoryId: EntityId
      description: string
      kind: 'expense' | 'income'
      notes: string | null
      occurredOn: string
      organizationId: string
      role: WorkspaceRole
      userId: EntityId
    }
  | {
      amountMinor: number
      description: string
      fromAccountId: EntityId
      kind: 'transfer'
      notes: string | null
      occurredOn: string
      organizationId: string
      role: WorkspaceRole
      toAccountId: EntityId
      userId: EntityId
    }

export type CreateTransactionError =
  | DomainError<
      'conflict' | 'not_found' | 'validation',
      | 'account_archived'
      | 'account_not_found'
      | 'category_archived'
      | 'category_kind_mismatch'
      | 'category_not_found'
      | 'currency_mismatch'
    >
  | AccessControlError

const checkAccount = async (
  organizationId: string,
  accountId: EntityId,
  accounts: AccountLookup,
): Promise<Result<{ currency: CurrencyCode; id: EntityId }, CreateTransactionError>> => {
  const account = await accounts.findActiveById(organizationId, accountId)
  if (!account) return err(notFoundError('account_not_found', 'Account not found.'))
  if (account.archivedAt) {
    return err(conflictError('account_archived', 'This account no longer accepts new entries.'))
  }
  return ok(account)
}

export const createTransaction = async (
  command: CreateTransactionCommand,
  repository: TransactionRepository,
  accounts: AccountLookup,
  categories: CategoryLookup,
): Promise<Result<Transaction, CreateTransactionError>> => {
  const access = requireFinancialWriteAccess(command.role)
  if (!access.ok) return access

  if (command.kind === 'transfer') {
    const from = await checkAccount(command.organizationId, command.fromAccountId, accounts)
    if (!from.ok) return from

    const to = await checkAccount(command.organizationId, command.toAccountId, accounts)
    if (!to.ok) return to

    if (from.value.currency !== to.value.currency) {
      return err(
        validationError('currency_mismatch', 'Both accounts must share the same currency.'),
      )
    }

    const legs = deriveLegs(command).map((leg) => ({
      ...leg,
      currency: from.value.currency,
      id: generateEntityId(),
    }))
    const created = await repository.create({
      categoryId: null,
      createdAt: new Date(),
      createdBy: command.userId,
      description: command.description,
      id: generateEntityId(),
      kind: 'transfer',
      legs,
      notes: command.notes,
      occurredOn: command.occurredOn,
      organizationId: command.organizationId,
    })

    return ok(created)
  }

  const account = await checkAccount(command.organizationId, command.accountId, accounts)
  if (!account.ok) return account

  const category = await categories.findActiveById(command.organizationId, command.categoryId)
  if (!category) return err(notFoundError('category_not_found', 'Category not found.'))
  if (category.archivedAt) {
    return err(
      conflictError('category_archived', 'This category no longer accepts new transactions.'),
    )
  }
  if (category.kind !== command.kind) {
    return err(
      validationError(
        'category_kind_mismatch',
        'The category kind must match the transaction kind.',
      ),
    )
  }

  const legs = deriveLegs(command).map((leg) => ({
    ...leg,
    currency: account.value.currency,
    id: generateEntityId(),
  }))
  const created = await repository.create({
    categoryId: command.categoryId,
    createdAt: new Date(),
    createdBy: command.userId,
    description: command.description,
    id: generateEntityId(),
    kind: command.kind,
    legs,
    notes: command.notes,
    occurredOn: command.occurredOn,
    organizationId: command.organizationId,
  })

  return ok(created)
}
