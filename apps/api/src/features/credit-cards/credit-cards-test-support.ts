import type { AccountKind } from '@fifilo/core/accounts'
import type {
  CardAccount,
  CardAccountLookup,
  CardInvoice,
  CreditCardDetails,
  CreditCardRepository,
  InstallmentPlanRepository,
  InstallmentTransactionShare,
  InvoiceRepository,
  NewInstallmentPlanRecord,
  NewInvoiceRecord,
} from '@fifilo/core/credit-cards'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'

import type { IdempotencyRecord, IdempotencyStore } from '../../libs/idempotency'

/** An in-memory stand-in for `idempotency_records` (mirrors `libs/idempotency.test.ts`'s own fake). */
export const createFakeIdempotencyStore = (): IdempotencyStore => {
  const records = new Map<string, IdempotencyRecord>()
  const keyOf = (organizationId: string, key: string) => `${organizationId}:${key}`

  return {
    async begin(organizationId, key, requestHash, _expiresAt) {
      const id = keyOf(organizationId, key)
      if (records.has(id)) return false
      records.set(id, { requestHash, responseBody: null, status: 'pending' })
      return true
    },
    async complete(organizationId, key, responseBody) {
      records.set(keyOf(organizationId, key), {
        requestHash: records.get(keyOf(organizationId, key))?.requestHash ?? '',
        responseBody,
        status: 'completed',
      })
    },
    async find(organizationId, key) {
      return records.get(keyOf(organizationId, key)) ?? null
    },
    async release(organizationId, key) {
      records.delete(keyOf(organizationId, key))
    },
  }
}

/**
 * In-memory stands-in for the Drizzle adapters, local to this feature's
 * route tests (Decision 001: not imported from `@fifilo/core`'s own
 * use-case tests - a deep path into another workspace's `src/` is not an
 * export the package publishes).
 */
export const createFakeCreditCardRepository = (
  seed: CreditCardDetails[] = [],
): CreditCardRepository => {
  const cards = new Map(seed.map((card) => [card.accountId, card]))

  return {
    async create(record) {
      if (cards.has(record.accountId)) return null
      const card: CreditCardDetails = {
        accountId: record.accountId,
        closingDay: record.closingDay,
        createdAt: record.createdAt,
        dueDay: record.dueDay,
        limitMinor: record.limitMinor,
        organizationId: record.organizationId,
        updatedAt: record.createdAt,
        version: 1,
      }
      cards.set(card.accountId, card)
      return card
    },

    async findByAccountId(organizationId, accountId) {
      const card = cards.get(accountId)
      return card && card.organizationId === organizationId ? card : null
    },
  }
}

export const createFakeCardAccountLookup = (accounts: CardAccount[] = []): CardAccountLookup => ({
  async findById(_organizationId, id) {
    return accounts.find((account) => account.id === id) ?? null
  },
})

export const createFakeInvoiceRepository = (seed: CardInvoice[] = []): InvoiceRepository => {
  const invoices = new Map(seed.map((invoice) => [invoice.id, invoice]))

  return {
    async close(organizationId, id, expectedVersion, totalMinor) {
      const invoice = invoices.get(id)
      if (!invoice || invoice.organizationId !== organizationId) return 'not_found'
      if (invoice.status !== 'open') return 'not_open'
      if (invoice.version !== expectedVersion) return 'version_conflict'

      const closed: CardInvoice = {
        ...invoice,
        closedAt: new Date(),
        status: 'closed',
        totalMinor,
        version: invoice.version + 1,
      }
      invoices.set(id, closed)
      return closed
    },

    async findByAccountAndPeriodStart(organizationId, accountId, periodStart) {
      return (
        [...invoices.values()].find(
          (invoice) =>
            invoice.organizationId === organizationId &&
            invoice.accountId === accountId &&
            invoice.periodStart === periodStart,
        ) ?? null
      )
    },

    async findById(organizationId, id) {
      const invoice = invoices.get(id)
      return invoice && invoice.organizationId === organizationId ? invoice : null
    },

    async findCurrentOpenByAccount(organizationId, accountId) {
      const open = [...invoices.values()]
        .filter(
          (invoice) =>
            invoice.organizationId === organizationId &&
            invoice.accountId === accountId &&
            invoice.status === 'open',
        )
        .sort((a, b) => (a.periodStart < b.periodStart ? -1 : 1))
      return open[0] ?? null
    },

    async findOrCreateOpen(record: NewInvoiceRecord) {
      const existing = [...invoices.values()].find(
        (invoice) =>
          invoice.organizationId === record.organizationId &&
          invoice.accountId === record.accountId &&
          invoice.periodStart === record.periodStart,
      )
      if (existing) return existing

      const invoice: CardInvoice = {
        accountId: record.accountId,
        closedAt: null,
        dueOn: record.dueOn,
        id: record.id,
        organizationId: record.organizationId,
        paidAt: null,
        periodEnd: record.periodEnd,
        periodStart: record.periodStart,
        status: 'open',
        totalMinor: 0,
        version: 1,
      }
      invoices.set(invoice.id, invoice)
      return invoice
    },

    async list(organizationId, accountId) {
      return [...invoices.values()].filter(
        (invoice) => invoice.organizationId === organizationId && invoice.accountId === accountId,
      )
    },

    async markPaid(organizationId, id, paidAt) {
      const invoice = invoices.get(id)
      if (!invoice || invoice.organizationId !== organizationId) return null
      const paid: CardInvoice = { ...invoice, paidAt, status: 'paid', version: invoice.version + 1 }
      invoices.set(id, paid)
      return paid
    },

    async sumEntries(_organizationId, _invoiceId) {
      return 0
    },

    async sumUnpaidClosedTotals(organizationId, accountId) {
      return [...invoices.values()]
        .filter(
          (invoice) =>
            invoice.organizationId === organizationId &&
            invoice.accountId === accountId &&
            invoice.status === 'closed',
        )
        .reduce((sum, invoice) => sum + invoice.totalMinor, 0)
    },
  }
}

export const createFakeInstallmentPlanRepository = (): InstallmentPlanRepository & {
  plans: NewInstallmentPlanRecord[]
  sharesByPlanId: Map<string, InstallmentTransactionShare[]>
} => {
  const plans: NewInstallmentPlanRecord[] = []
  const sharesByPlanId = new Map<string, InstallmentTransactionShare[]>()

  return {
    plans,
    sharesByPlanId,

    async createWithTransactions(plan, shares) {
      plans.push(plan)
      sharesByPlanId.set(plan.id, [...shares])
      return shares.map(() => generateEntityId())
    },
  }
}

export const seedCardAccount = (overrides: Partial<CardAccount> = {}): CardAccount => ({
  archivedAt: null,
  currency: 'BRL',
  id: 'card_account_default' as EntityId,
  kind: 'credit_card' as AccountKind,
  ...overrides,
})

export const seedCreditCard = (overrides: Partial<CreditCardDetails> = {}): CreditCardDetails => ({
  accountId: 'card_account_default' as EntityId,
  closingDay: 10,
  createdAt: new Date(),
  dueDay: 20,
  limitMinor: 500_000,
  organizationId: 'org_default',
  updatedAt: new Date(),
  version: 1,
  ...overrides,
})

export const seedInvoice = (overrides: Partial<CardInvoice> = {}): CardInvoice => ({
  accountId: 'card_account_default' as EntityId,
  closedAt: null,
  dueOn: '2026-06-20',
  id: generateEntityId(),
  organizationId: 'org_default',
  paidAt: null,
  periodEnd: '2026-06-10',
  periodStart: '2026-05-11',
  status: 'open',
  totalMinor: 0,
  version: 1,
  ...overrides,
})
