/**
 * Fase 06 turns this into a workspace setting; until then it is fixed here,
 * mirroring `apps/web/src/features/transactions/resolve-this-month.ts`'s own
 * deferred-scope note. The credit card use cases (`resolveInvoiceForOccurrence`,
 * `payInvoice`, `listInvoices`, `getInvoice`) take "today" as an explicit
 * civil date (Decision 018) - this is the one place a route resolves it,
 * never the server clock read directly inside a use case.
 */
export const DEFAULT_WORKSPACE_TIMEZONE = 'America/Sao_Paulo'

export const workspaceToday = (
  now: Date = new Date(),
  timeZone: string = DEFAULT_WORKSPACE_TIMEZONE,
): string =>
  new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).format(now)
