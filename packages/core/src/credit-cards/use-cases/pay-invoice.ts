import { type DomainError, conflictError, notFoundError, validationError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { AccountLookup, TransactionRepository } from '../../transactions'
import { createTransaction } from '../../transactions'
import { type CardInvoice, canPay } from '../invoice'
import type { CardAccountLookup, InvoiceRepository } from '../ports'

export type PayInvoiceCommand = {
  fromAccountId: EntityId
  id: EntityId
  organizationId: string
  today: string
  userId: EntityId
}

export type PayInvoiceError = DomainError<
  'conflict' | 'not_found' | 'validation',
  | 'account_archived'
  | 'account_not_found'
  | 'currency_mismatch'
  | 'invoice_already_paid'
  | 'invoice_not_closed'
  | 'invoice_not_found'
>

/**
 * Paying is a transfer from the source account to the card account, the
 * same mechanism Fase 01/02 already ship (Decision 025) - no new movement
 * type. Fase 03 pays the invoice in full; a partial payment that carries a
 * remainder into the next invoice is deferred, signaled, not built silently
 * half-right (Fase 03 § Riscos names it, this phase's session log repeats
 * why it is cut).
 */
export const payInvoice = async (
  command: PayInvoiceCommand,
  invoices: InvoiceRepository,
  cardAccounts: CardAccountLookup,
  accounts: AccountLookup,
  transactions: TransactionRepository,
): Promise<Result<{ invoice: CardInvoice; transactionId: EntityId }, PayInvoiceError>> => {
  const invoice = await invoices.findById(command.organizationId, command.id)
  if (!invoice) return err(notFoundError('invoice_not_found', 'Invoice not found.'))
  if (invoice.status === 'paid') {
    return err(conflictError('invoice_already_paid', 'This invoice is already paid.'))
  }
  if (!canPay(invoice)) {
    return err(conflictError('invoice_not_closed', 'Close the invoice before paying it.'))
  }

  const cardAccount = await cardAccounts.findById(command.organizationId, invoice.accountId)
  if (!cardAccount) return err(notFoundError('account_not_found', 'Card account not found.'))

  const fromAccount = await accounts.findActiveById(command.organizationId, command.fromAccountId)
  if (!fromAccount) return err(notFoundError('account_not_found', 'Account not found.'))
  if (fromAccount.archivedAt) {
    return err(conflictError('account_archived', 'This account no longer accepts new entries.'))
  }
  if (fromAccount.currency !== cardAccount.currency) {
    return err(validationError('currency_mismatch', 'Both accounts must share the same currency.'))
  }

  const transfer = await createTransaction(
    {
      amountMinor: invoice.totalMinor,
      description: 'Pagamento de fatura',
      fromAccountId: command.fromAccountId,
      kind: 'transfer',
      notes: null,
      occurredOn: command.today,
      organizationId: command.organizationId,
      toAccountId: invoice.accountId,
      userId: command.userId,
    },
    transactions,
    accounts,
    // The transfer branch never reads categories (`create-transaction.ts`);
    // this lookup exists only to satisfy the shared signature.
    { findActiveById: async () => null },
  )
  if (!transfer.ok) {
    return err(notFoundError('account_not_found', transfer.error.message))
  }

  const paid = await invoices.markPaid(command.organizationId, command.id, new Date())
  if (!paid) return err(notFoundError('invoice_not_found', 'Invoice not found.'))

  return ok({ invoice: paid, transactionId: transfer.value.id })
}
