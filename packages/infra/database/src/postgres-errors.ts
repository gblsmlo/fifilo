/**
 * Postgres SQLSTATE codes the persistence layer classifies an error by,
 * never by parsing the driver's message text (Decision 004).
 */
export const POSTGRES_UNIQUE_VIOLATION = '23505'

/**
 * Drizzle wraps the driver's error in `DrizzleQueryError`; the SQLSTATE
 * (`errno`) lives on `.cause`, not on the wrapper itself. Checking only the
 * top-level property looks correct in every unit test (which throws the raw
 * error directly) and silently never matches through a real Drizzle call -
 * exactly the shape of bug a fixture-only test cannot catch.
 */
const readErrno = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined

  const direct = (error as { errno?: unknown }).errno
  if (typeof direct === 'string') return direct

  const cause = (error as { cause?: unknown }).cause
  if (typeof cause === 'object' && cause !== null) {
    const nested = (cause as { errno?: unknown }).errno
    if (typeof nested === 'string') return nested
  }

  return undefined
}

export const isPostgresErrorCode = (error: unknown, code: string): boolean =>
  readErrno(error) === code

export const isUniqueViolation = (error: unknown): boolean =>
  isPostgresErrorCode(error, POSTGRES_UNIQUE_VIOLATION)
