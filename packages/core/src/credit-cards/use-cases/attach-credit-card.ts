import { type DomainError, conflictError, notFoundError, validationError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { CreditCardDetails } from '../credit-card'
import type { CardAccountLookup, CreditCardRepository } from '../ports'

export type AttachCreditCardCommand = {
  accountId: EntityId
  closingDay: number
  dueDay: number
  limitMinor: number
  organizationId: string
}

export type AttachCreditCardError = DomainError<
  'conflict' | 'not_found' | 'validation',
  | 'account_archived'
  | 'account_not_credit_card'
  | 'account_not_found'
  | 'credit_card_already_attached'
>

/**
 * One `credit_card_details` row per account (Fase 03 § Persistência): the
 * account must already exist as `kind = credit_card` and carry nothing yet.
 * Editing the terms afterwards is out of scope this phase.
 */
export const attachCreditCard = async (
  command: AttachCreditCardCommand,
  repository: CreditCardRepository,
  accounts: CardAccountLookup,
): Promise<Result<CreditCardDetails, AttachCreditCardError>> => {
  const account = await accounts.findById(command.organizationId, command.accountId)
  if (!account) return err(notFoundError('account_not_found', 'Account not found.'))
  if (account.archivedAt) {
    return err(conflictError('account_archived', 'This account is archived.'))
  }
  if (account.kind !== 'credit_card') {
    return err(
      validationError('account_not_credit_card', 'Only a credit card account takes these details.'),
    )
  }

  const existing = await repository.findByAccountId(command.organizationId, command.accountId)
  if (existing) {
    return err(
      conflictError('credit_card_already_attached', 'This account already has card details.'),
    )
  }

  const created = await repository.create({
    accountId: command.accountId,
    closingDay: command.closingDay,
    createdAt: new Date(),
    dueDay: command.dueDay,
    limitMinor: command.limitMinor,
    organizationId: command.organizationId,
  })

  if (!created) {
    return err(
      conflictError('credit_card_already_attached', 'This account already has card details.'),
    )
  }

  return ok(created)
}
