import { type DomainError, conflictError, notFoundError, validationError } from '../../errors'
import type { EntityId } from '../../primitives'
import { generateEntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { ActiveCategory, CategoryLookup } from '../../transactions'
import { buildInstallmentShares } from '../installment'
import type {
  CardAccountLookup,
  CreditCardRepository,
  InstallmentPlanRepository,
  InstallmentTransactionShare,
  InvoiceRepository,
} from '../ports'
import { resolveInvoiceForOccurrence } from './resolve-invoice-for-occurrence'

export type CreateInstallmentPurchaseCommand = {
  accountId: EntityId
  categoryId: EntityId
  description: string
  firstOccurredOn: string
  installments: number
  notes: string | null
  organizationId: string
  today: string
  totalMinor: number
  userId: EntityId
}

export type CreateInstallmentPurchaseError = DomainError<
  'conflict' | 'not_found' | 'validation',
  | 'account_archived'
  | 'account_not_credit_card'
  | 'account_not_found'
  | 'category_archived'
  | 'category_kind_mismatch'
  | 'category_not_found'
  | 'credit_card_not_configured'
  | 'invalid_installment_count'
>

const checkCategory = async (
  organizationId: string,
  categoryId: EntityId,
  categories: CategoryLookup,
): Promise<Result<ActiveCategory, CreateInstallmentPurchaseError>> => {
  const category = await categories.findActiveById(organizationId, categoryId)
  if (!category) return err(notFoundError('category_not_found', 'Category not found.'))
  if (category.archivedAt) {
    return err(
      conflictError('category_archived', 'This category no longer accepts new transactions.'),
    )
  }
  if (category.kind !== 'expense') {
    return err(
      validationError('category_kind_mismatch', 'A card purchase must use an expense category.'),
    )
  }
  return ok(category)
}

/**
 * One purchase becomes one plan row and `installments` transactions, one per
 * consecutive cycle (Fase 03 § Modelagem). Every share is resolved to its own
 * invoice - most land on a freshly-opened future cycle, none ever retroactive
 * since every share's date is today or later.
 */
export const createInstallmentPurchase = async (
  command: CreateInstallmentPurchaseCommand,
  plans: InstallmentPlanRepository,
  cards: CreditCardRepository,
  invoices: InvoiceRepository,
  accounts: CardAccountLookup,
  categories: CategoryLookup,
): Promise<Result<EntityId[], CreateInstallmentPurchaseError>> => {
  const account = await accounts.findById(command.organizationId, command.accountId)
  if (!account) return err(notFoundError('account_not_found', 'Account not found.'))
  if (account.archivedAt) {
    return err(conflictError('account_archived', 'This account no longer accepts new entries.'))
  }
  if (account.kind !== 'credit_card') {
    return err(
      validationError('account_not_credit_card', 'Only a credit card account takes installments.'),
    )
  }

  const card = await cards.findByAccountId(command.organizationId, command.accountId)
  if (!card) {
    return err(
      notFoundError('credit_card_not_configured', 'This account has no credit card details yet.'),
    )
  }

  const category = await checkCategory(command.organizationId, command.categoryId, categories)
  if (!category.ok) return category

  const allocation = buildInstallmentShares(
    { amountMinor: command.totalMinor, currency: account.currency },
    command.installments,
    command.firstOccurredOn,
  )
  if (!allocation.ok) {
    return err(validationError('invalid_installment_count', allocation.error.message))
  }

  const shares: InstallmentTransactionShare[] = []
  for (const share of allocation.value) {
    const resolved = await resolveInvoiceForOccurrence(
      {
        accountId: command.accountId,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        occurredOn: share.occurredOn,
        organizationId: command.organizationId,
        today: command.today,
      },
      invoices,
    )

    shares.push({
      accountId: command.accountId,
      amountMinor: -share.amountMinor,
      currency: account.currency,
      installmentNumber: share.installmentNumber,
      invoiceId: resolved.invoice.id,
      occurredOn: share.occurredOn,
    })
  }

  const transactionIds = await plans.createWithTransactions(
    {
      categoryId: command.categoryId,
      createdAt: new Date(),
      createdBy: command.userId,
      description: command.description,
      firstOccurredOn: command.firstOccurredOn,
      id: generateEntityId(),
      installments: command.installments,
      notes: command.notes,
      organizationId: command.organizationId,
      totalMinor: command.totalMinor,
    },
    shares,
  )

  return ok(transactionIds)
}
