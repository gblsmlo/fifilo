/**
 * The workspace's own default (`workspace_settings.timezone`, Fase 06 §
 * Modelagem) - this is the fallback for the moment before that setting has
 * ever loaded, never a value production code is meant to keep reading.
 * Decision 018: "this month" is the Web's job, resolved from the workspace
 * timezone, never the viewer's.
 */
export const DEFAULT_WORKSPACE_TIMEZONE = 'America/Sao_Paulo'

const civilDateIn = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).format(date)

const toCivilString = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export type DateRange = { from: string; to: string }

/**
 * The workspace's own civil "today" (Decision 018) - never
 * `new Date().toISOString()`, which reads UTC and drifts from the workspace's
 * calendar day for part of every day the workspace's own offset is behind
 * UTC (a transaction "registered today" landing on tomorrow's date for up to
 * a few hours - the bug a fresh org's default timezone made visible in
 * `transactions.spec.ts` at 22:55 local time / 01:55 UTC).
 */
export const civilDateToday = (
  timeZone: string = DEFAULT_WORKSPACE_TIMEZONE,
  now: Date = new Date(),
): string => civilDateIn(now, timeZone)

/**
 * The civil-date range of the workspace's financial month containing `now`,
 * in `timeZone`. Never `new Date(occurredOn)`: that materializes an instant
 * and reintroduces the defect Decision 018 closes.
 *
 * `monthStartDay` (`workspace_settings.monthStartDay`, Fase 06 § Modelagem)
 * shifts the window instead of always starting on the 1st: when today's
 * civil day is before `monthStartDay`, the current financial month began
 * last calendar month and runs into this one. `Date.UTC` normalizes the
 * month/day overflow this produces (day 0, month 12) instead of a hand-rolled
 * calendar table - Core's `isValidMonthStartDay` already guarantees the value
 * never exceeds 28, so every shifted month has that day to give.
 */
export const resolveThisMonthRange = (
  now: Date = new Date(),
  timeZone: string = DEFAULT_WORKSPACE_TIMEZONE,
  monthStartDay = 1,
): DateRange => {
  const [year, month, day] = civilDateIn(now, timeZone).split('-').map(Number) as [
    number,
    number,
    number,
  ]

  const startsThisCalendarMonth = day >= monthStartDay
  const start = new Date(
    Date.UTC(year, month - 1 - (startsThisCalendarMonth ? 0 : 1), monthStartDay),
  )
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, monthStartDay - 1))

  return { from: toCivilString(start), to: toCivilString(end) }
}
