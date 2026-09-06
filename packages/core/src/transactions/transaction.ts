import type { EntityId } from '../primitives'

export type TransactionKind = 'expense' | 'income' | 'transfer'

export type TransactionLeg = {
  accountId: EntityId
  amountMinor: number
}

export type Transaction = {
  categoryId: EntityId | null
  createdAt: Date
  createdBy: EntityId
  description: string
  id: EntityId
  kind: TransactionKind
  /** The legs the entries table actually holds - read here, never derived again on read (Decision 021). */
  legs: readonly TransactionLeg[]
  notes: string | null
  occurredOn: string
  organizationId: string
  updatedAt: Date
  version: number
}

type LegSource =
  | { accountId: EntityId; kind: 'expense' | 'income' }
  | { fromAccountId: EntityId; kind: 'transfer'; toAccountId: EntityId }

/**
 * The client sends only a positive amount; the sign is derived here, never
 * client input (Fase 02 § Riscos - a signed input is a path to a positive
 * expense reaching the database). Transfer legs always sum to zero by
 * construction, not by a check after the fact.
 */
export const deriveLegs = (source: LegSource & { amountMinor: number }): TransactionLeg[] => {
  if (source.kind === 'transfer') {
    return [
      { accountId: source.fromAccountId, amountMinor: -source.amountMinor },
      { accountId: source.toAccountId, amountMinor: source.amountMinor },
    ]
  }

  const sign = source.kind === 'income' ? 1 : -1
  return [{ accountId: source.accountId, amountMinor: sign * source.amountMinor }]
}
