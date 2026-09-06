/**
 * Fase 06 turns this into a workspace setting (`monthStartDay`, timezone).
 * Until then the workspace is fixed here, but the resolution already never
 * reads the browser's or the runner's local timezone — Decision 018: "this
 * month" is the Web's job, resolved from the workspace timezone, never the
 * viewer's.
 */
export const DEFAULT_WORKSPACE_TIMEZONE = 'America/Sao_Paulo'

const civilDateIn = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).format(date)

const daysInMonth = (year: number, month: number): number =>
  // Day 0 of the following month is the last day of this one; `Date.UTC`
  // never touches a local or workspace clock, only calendar arithmetic.
  new Date(Date.UTC(year, month, 0)).getUTCDate()

export type DateRange = { from: string; to: string }

/**
 * The civil-date range of "this month" in `timeZone`, as of `now`. Never
 * `new Date(occurredOn)`: that materializes an instant and reintroduces the
 * defect Decision 018 closes.
 */
export const resolveThisMonthRange = (
  now: Date = new Date(),
  timeZone: string = DEFAULT_WORKSPACE_TIMEZONE,
): DateRange => {
  const [year, month] = civilDateIn(now, timeZone).split('-').map(Number) as [number, number]
  const pad = (value: number): string => String(value).padStart(2, '0')

  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
  }
}
