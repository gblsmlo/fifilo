import type { AccountKind } from '../accounts'
import type { CurrencyCode, EntityId } from '../primitives'
import type { CreditCardDetails } from './credit-card'
import type { CardInvoice } from './invoice'

export type NewCreditCardRecord = {
  accountId: EntityId
  closingDay: number
  createdAt: Date
  dueDay: number
  limitMinor: number
  organizationId: string
}

/**
 * The persistence a use case needs, not the shape of `credit_card_details`
 * (Decision 003). One row per account, so `create` is the only write this
 * phase needs - editing the card's terms is not in scope (Fase 03 § Escopo).
 */
export type CreditCardRepository = {
  create: (record: NewCreditCardRecord) => Promise<CreditCardDetails | null>
  findByAccountId: (
    organizationId: string,
    accountId: EntityId,
  ) => Promise<CreditCardDetails | null>
}

export type NewInvoiceRecord = {
  accountId: EntityId
  dueOn: string
  id: EntityId
  organizationId: string
  periodEnd: string
  periodStart: string
}

export type CloseInvoiceOutcome = CardInvoice | 'not_found' | 'not_open' | 'version_conflict'

/**
 * `findCurrentOpenByAccount` returns the open invoice with the earliest
 * period - the account's actual current cycle - even when later, future
 * periods already exist as `open` placeholders from a pre-created
 * installment schedule (Fase 03 § Modelagem: a retroactive entry lands on
 * this one, never on a future placeholder and never reopening a closed row).
 */
export type InvoiceRepository = {
  close: (
    organizationId: string,
    id: EntityId,
    expectedVersion: number,
    totalMinor: number,
  ) => Promise<CloseInvoiceOutcome>
  findByAccountAndPeriodStart: (
    organizationId: string,
    accountId: EntityId,
    periodStart: string,
  ) => Promise<CardInvoice | null>
  findById: (organizationId: string, id: EntityId) => Promise<CardInvoice | null>
  findCurrentOpenByAccount: (
    organizationId: string,
    accountId: EntityId,
  ) => Promise<CardInvoice | null>
  findOrCreateOpen: (record: NewInvoiceRecord) => Promise<CardInvoice>
  list: (organizationId: string, accountId: EntityId) => Promise<CardInvoice[]>
  markPaid: (organizationId: string, id: EntityId, paidAt: Date) => Promise<CardInvoice | null>
  sumEntries: (organizationId: string, invoiceId: EntityId) => Promise<number>
  sumUnpaidClosedTotals: (organizationId: string, accountId: EntityId) => Promise<number>
}

export type NewInstallmentPlanRecord = {
  categoryId: EntityId | null
  createdAt: Date
  createdBy: EntityId
  description: string
  firstOccurredOn: string
  id: EntityId
  installments: number
  notes: string | null
  organizationId: string
  totalMinor: number
}

export type InstallmentTransactionShare = {
  accountId: EntityId
  /** Always negative: an installment is a card purchase, an expense, the same sign convention `deriveLegs` applies (Fase 02 § Modelagem). */
  amountMinor: number
  currency: CurrencyCode
  installmentNumber: number
  invoiceId: EntityId
  occurredOn: string
}

/**
 * `createWithTransactions` writes the plan row and every installment
 * transaction in one call, so the adapter owns the single database
 * transaction they share - N transactions created and one failing halfway
 * would otherwise leave a plan with a gap in its installment numbers.
 */
export type InstallmentPlanRepository = {
  createWithTransactions: (
    plan: NewInstallmentPlanRecord,
    shares: readonly InstallmentTransactionShare[],
  ) => Promise<EntityId[]>
}

export type InvoiceItem = {
  amountMinor: number
  description: string
  id: EntityId
  installmentNumber: number | null
  occurredOn: string
}

/** The itemized view a single-invoice page needs - the entries assigned to it, not the whole `entries` table (Decision 003). */
export type InvoiceItemReader = {
  listByInvoice: (organizationId: string, invoiceId: EntityId) => Promise<InvoiceItem[]>
}

export type CardAccount = {
  archivedAt: Date | null
  currency: CurrencyCode
  id: EntityId
  kind: AccountKind
}

/** The minimal read credit-card use cases need from accounts - not the full `AccountRepository` (Decision 003). */
export type CardAccountLookup = {
  findById: (organizationId: string, id: EntityId) => Promise<CardAccount | null>
}
