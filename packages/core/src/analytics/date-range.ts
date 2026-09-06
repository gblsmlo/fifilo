import { type DomainError, validationError } from '../errors'
import { type Result, err, ok } from '../result'

export type DateRangeError = DomainError<'validation', 'invalid_date_range'>

/**
 * Every projection takes the period as two explicit civil dates (Fase 05 §
 * Modelagem) - the domain never assumes "today," so a test never becomes
 * hostage to the day it runs on. This is the one check every use case
 * shares: the range itself has to make sense before any query runs.
 */
export const validateDateRange = (from: string, to: string): Result<true, DateRangeError> =>
  from <= to
    ? ok(true)
    : err(validationError('invalid_date_range', '"from" must not be after "to".'))
