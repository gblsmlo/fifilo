import type { EntityId } from '../../primitives'
import { generateEntityId } from '../../primitives'
import { deriveBillingCycle } from '../cycle'
import type { CardInvoice } from '../invoice'
import type { InvoiceRepository } from '../ports'

export type ResolveInvoiceCommand = {
  accountId: EntityId
  closingDay: number
  dueDay: number
  occurredOn: string
  organizationId: string
  /** The workspace's civil "today" (Decision 018 - never the runner's clock), used only as the fallback cycle when a retroactive entry finds no open invoice at all to redirect to. */
  today: string
}

export type ResolvedInvoice = {
  invoice: CardInvoice
  /** True when the naturally-derived cycle's invoice was already closed and the entry was redirected here instead (Fase 03 § Modelagem: never reopens a closed invoice). */
  retroactive: boolean
}

/**
 * Every entry on a credit card account is assigned to an invoice the moment
 * it is created (Fase 03 § Escopo: "atribuição automática de lançamento ao
 * ciclo"). A late entry whose natural cycle already closed does not reopen
 * it - it lands on the account's current open invoice instead, flagged.
 */
export const resolveInvoiceForOccurrence = async (
  command: ResolveInvoiceCommand,
  invoices: InvoiceRepository,
): Promise<ResolvedInvoice> => {
  const cycle = deriveBillingCycle(command.occurredOn, command.closingDay, command.dueDay)

  const natural = await invoices.findByAccountAndPeriodStart(
    command.organizationId,
    command.accountId,
    cycle.periodStart,
  )

  if (natural && natural.status !== 'open') {
    const current = await invoices.findCurrentOpenByAccount(
      command.organizationId,
      command.accountId,
    )
    if (current) return { invoice: current, retroactive: true }

    // No open invoice exists at all yet: open the account's actual current
    // cycle instead of falling through to `natural`, which would silently
    // reopen the closed invoice this whole branch exists to protect.
    const currentCycle = deriveBillingCycle(command.today, command.closingDay, command.dueDay)
    const opened = await invoices.findOrCreateOpen({
      accountId: command.accountId,
      dueOn: currentCycle.dueOn,
      id: generateEntityId(),
      organizationId: command.organizationId,
      periodEnd: currentCycle.periodEnd,
      periodStart: currentCycle.periodStart,
    })
    return { invoice: opened, retroactive: true }
  }

  const invoice =
    natural ??
    (await invoices.findOrCreateOpen({
      accountId: command.accountId,
      dueOn: cycle.dueOn,
      id: generateEntityId(),
      organizationId: command.organizationId,
      periodEnd: cycle.periodEnd,
      periodStart: cycle.periodStart,
    }))

  return { invoice, retroactive: false }
}
