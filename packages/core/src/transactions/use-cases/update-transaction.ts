import { type DomainError, conflictError, notFoundError, validationError } from '../../errors'
import type { CurrencyCode, EntityId } from '../../primitives'
import { generateEntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { AccountLookup, CategoryLookup, TransactionRepository } from '../ports'
import type { Transaction } from '../transaction'
import { deriveLegs } from '../transaction'

export type UpdateTransactionCommand =
  | {
      accountId: EntityId
      amountMinor: number
      categoryId: EntityId
      description: string
      expectedVersion: number
      id: EntityId
      kind: 'expense' | 'income'
      notes: string | null
      occurredOn: string
      organizationId: string
    }
  | {
      amountMinor: number
      description: string
      expectedVersion: number
      fromAccountId: EntityId
      id: EntityId
      kind: 'transfer'
      notes: string | null
      occurredOn: string
      organizationId: string
      toAccountId: EntityId
    }

export type UpdateTransactionError = DomainError<
  'conflict' | 'not_found' | 'validation',
  | 'account_archived'
  | 'account_not_found'
  | 'category_archived'
  | 'category_kind_mismatch'
  | 'category_not_found'
  | 'currency_mismatch'
  | 'transaction_kind_immutable'
  | 'transaction_not_found'
  | 'version_conflict'
>

const checkAccount = async (
  organizationId: string,
  accountId: EntityId,
  accounts: AccountLookup,
): Promise<Result<{ currency: CurrencyCode }, UpdateTransactionError>> => {
  const account = await accounts.findActiveById(organizationId, accountId)
  if (!account) return err(notFoundError('account_not_found', 'Account not found.'))
  if (account.archivedAt) {
    return err(conflictError('account_archived', 'This account no longer accepts new entries.'))
  }
  return ok(account)
}

/**
 * Rewrites the legs entirely inside the same database transaction as the
 * row (Fase 02 § Modelagem) - the adapter deletes and reinserts rather than
 * diffing, so a transfer never ends up with one leg rewritten and the other
 * stale.
 */
export const updateTransaction = async (
  command: UpdateTransactionCommand,
  repository: TransactionRepository,
  accounts: AccountLookup,
  categories: CategoryLookup,
): Promise<Result<Transaction, UpdateTransactionError>> => {
  const existing = await repository.findById(command.organizationId, command.id)
  if (!existing) return err(notFoundError('transaction_not_found', 'Transaction not found.'))
  if (existing.kind !== command.kind) {
    return err(
      validationError(
        'transaction_kind_immutable',
        "A transaction's kind cannot change once created.",
      ),
    )
  }

  let legCurrency: CurrencyCode

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

    legCurrency = from.value.currency
  } else {
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

    legCurrency = account.value.currency
  }

  const legs = deriveLegs(command).map((leg) => ({
    ...leg,
    currency: legCurrency,
    id: generateEntityId(),
  }))
  const outcome = await repository.update(
    command.organizationId,
    command.id,
    command.expectedVersion,
    {
      categoryId: command.kind === 'transfer' ? null : command.categoryId,
      description: command.description,
      legs,
      notes: command.notes,
      occurredOn: command.occurredOn,
    },
  )

  if (outcome === 'not_found')
    return err(notFoundError('transaction_not_found', 'Transaction not found.'))
  if (outcome === 'version_conflict') {
    return err(conflictError('version_conflict', 'This transaction changed since it was loaded.'))
  }

  return ok(outcome)
}
