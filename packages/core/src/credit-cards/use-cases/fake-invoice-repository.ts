import type { CardInvoice } from '../invoice'
import type { InvoiceRepository, NewInvoiceRecord } from '../ports'

/** An in-memory stand-in for the Drizzle adapter, shared by this folder's tests. */
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
            (invoice.status === 'closed' || invoice.status === 'overdue'),
        )
        .reduce((sum, invoice) => sum + invoice.totalMinor, 0)
    },
  }
}
