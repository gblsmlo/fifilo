/**
 * The billing cycle is derived from `closingDay`, never stored per invoice
 * (Fase 03 § Modelagem): given the closing day and a date, the period is
 * deterministic. `card_invoices` exists as a row only because it carries
 * state (open/closed/paid), not because the period needs remembering.
 */
export type BillingCycle = {
  dueOn: string
  periodEnd: string
  periodStart: string
}

type DateParts = { day: number; month: number; year: number }

const parseDate = (value: string): DateParts => {
  const [year, month, day] = value.split('-').map(Number)
  return { day: day ?? 1, month: (month ?? 1) - 1, year: year ?? 1970 }
}

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

const formatDate = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)

/** Clamps a nominal day (a closing or due day up to 31) to the month it actually falls in - day 31 in February lands on its last day. */
const dateInMonth = (year: number, month: number, nominalDay: number): string =>
  formatDate(year, month, Math.min(nominalDay, daysInMonth(year, month)))

const shiftMonths = (
  year: number,
  month: number,
  delta: number,
): { month: number; year: number } => {
  const total = year * 12 + month + delta
  return { month: ((total % 12) + 12) % 12, year: Math.floor(total / 12) }
}

const addDays = (value: string, delta: number): string => {
  const { day, month, year } = parseDate(value)
  return new Date(Date.UTC(year, month, day + delta)).toISOString().slice(0, 10)
}

/**
 * Resolves the invoice period and due date a purchase on `occurredOn` falls
 * into. Two rules the calendar alone does not give for free (Fase 03 §
 * Modelagem, each proven by its own test case):
 *
 * - a purchase **on** the closing date itself belongs to the next cycle, not
 *   the one closing that day;
 * - a due day earlier than the closing day falls in the month after closing,
 *   never the same month (a due date before the close would be negative).
 */
export const deriveBillingCycle = (
  occurredOn: string,
  closingDay: number,
  dueDay: number,
): BillingCycle => {
  const { month, year } = parseDate(occurredOn)
  const closingThisMonth = dateInMonth(year, month, closingDay)

  const closesNextMonth = occurredOn >= closingThisMonth
  const periodEndMonth = closesNextMonth ? shiftMonths(year, month, 1) : { month, year }
  const periodEnd = dateInMonth(periodEndMonth.year, periodEndMonth.month, closingDay)

  const previousMonth = shiftMonths(periodEndMonth.year, periodEndMonth.month, -1)
  const previousClosing = dateInMonth(previousMonth.year, previousMonth.month, closingDay)
  const periodStart = addDays(previousClosing, 1)

  const dueMonthDelta = dueDay > closingDay ? 0 : 1
  const dueMonth = shiftMonths(periodEndMonth.year, periodEndMonth.month, dueMonthDelta)
  const dueOn = dateInMonth(dueMonth.year, dueMonth.month, dueDay)

  return { dueOn, periodEnd, periodStart }
}

/**
 * Shifts a date forward by whole calendar months, clamping the day to the
 * target month (31 January plus one month is 28 or 29 February, never
 * March). Shared by installment scheduling (`installment.ts`): each share
 * lands one cycle further than the last.
 */
export const addCalendarMonths = (value: string, months: number): string => {
  const { day, month, year } = parseDate(value)
  const shifted = shiftMonths(year, month, months)
  return dateInMonth(shifted.year, shifted.month, day)
}
