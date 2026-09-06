import { type Result, err, ok } from './result'

/**
 * Branded identifiers and value primitives shared by core subdomains.
 *
 * `EntityId` keeps the exact same structural brand as the legacy
 * `@fifilo/domain/domain-primitives` definition, so a core `EntityId` and a
 * domain `EntityId` are interchangeable during the migration.
 */
export type EntityId = string & { readonly __brand: 'EntityId' }
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' }
export type WorkspaceSlug = string & { readonly __brand: 'WorkspaceSlug' }

export type PrimitiveError = {
  code: 'invalid_entity_id' | 'invalid_name' | 'invalid_workspace_slug'
  message: string
}

const workspaceSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const entityId = (value: string): Result<EntityId, PrimitiveError> => {
  const id = value.trim()

  if (id.length === 0) {
    return err({
      code: 'invalid_entity_id',
      message: 'Entity id is required.',
    })
  }

  return ok(id as EntityId)
}

export const nonEmptyString = (
  value: string,
  field = 'Value',
): Result<NonEmptyString, PrimitiveError> => {
  const normalized = value.trim()

  if (normalized.length === 0) {
    return err({
      code: 'invalid_name',
      message: `${field} is required.`,
    })
  }

  return ok(normalized as NonEmptyString)
}

export const workspaceSlug = (value: string): Result<WorkspaceSlug, PrimitiveError> => {
  const normalized = value.trim().toLowerCase()

  if (!workspaceSlugPattern.test(normalized)) {
    return err({
      code: 'invalid_workspace_slug',
      message: 'Workspace slug must contain lowercase letters, numbers, and single hyphens.',
    })
  }

  return ok(normalized as WorkspaceSlug)
}

/**
 * Money is a signed integer in the currency's minor unit (Decision 017): no
 * layer — Core, adapter, route or Web — handles a decimal or a float.
 * `amountMinor` maps to `bigint('amount_minor', { mode: 'number' })`, exact up
 * to `Number.MAX_SAFE_INTEGER`.
 */
export type CurrencyCode = 'BHD' | 'BRL' | 'EUR' | 'GBP' | 'JPY' | 'USD'

/**
 * Minor-unit exponent per ISO 4217, read here and never assumed to be 2:
 * BRL and USD have two decimal places, JPY has none, BHD has three.
 */
const currencyExponents: Record<CurrencyCode, number> = {
  BHD: 3,
  BRL: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  USD: 2,
}

export const currencyExponent = (currency: CurrencyCode): number => currencyExponents[currency]

export type Money = {
  amountMinor: number
  currency: CurrencyCode
}

export type MoneyError = {
  code: 'amount_out_of_range' | 'currency_mismatch'
  message: string
}

/**
 * The ceiling `amountMinor` can carry without losing precision as a JavaScript
 * number. Declared once so the contract that will validate money fields
 * (Decision 002 § one fact, one owner) reuses it instead of a second limit.
 */
export const MONEY_AMOUNT_MINOR_MAX = Number.MAX_SAFE_INTEGER

const isAmountInRange = (amountMinor: number) =>
  Number.isInteger(amountMinor) && Math.abs(amountMinor) <= MONEY_AMOUNT_MINOR_MAX

export const money = (amountMinor: number, currency: CurrencyCode): Result<Money, MoneyError> => {
  if (!isAmountInRange(amountMinor)) {
    return err({
      code: 'amount_out_of_range',
      message: `Money amount must be an integer between -${MONEY_AMOUNT_MINOR_MAX} and ${MONEY_AMOUNT_MINOR_MAX}.`,
    })
  }

  return ok({ amountMinor, currency })
}

const sameCurrency = (a: Money, b: Money): Result<CurrencyCode, MoneyError> =>
  a.currency === b.currency
    ? ok(a.currency)
    : err({
        code: 'currency_mismatch',
        message: `Cannot combine ${a.currency} with ${b.currency}.`,
      })

export const add = (a: Money, b: Money): Result<Money, MoneyError> => {
  const currency = sameCurrency(a, b)
  return currency.ok ? money(a.amountMinor + b.amountMinor, currency.value) : currency
}

export const subtract = (a: Money, b: Money): Result<Money, MoneyError> => {
  const currency = sameCurrency(a, b)
  return currency.ok ? money(a.amountMinor - b.amountMinor, currency.value) : currency
}

export const negate = (a: Money): Money => ({
  amountMinor: -a.amountMinor,
  currency: a.currency,
})

export const compare = (a: Money, b: Money): Result<-1 | 0 | 1, MoneyError> => {
  const currency = sameCurrency(a, b)
  if (!currency.ok) return currency
  if (a.amountMinor === b.amountMinor) return ok(0)
  return ok(a.amountMinor < b.amountMinor ? -1 : 1)
}

/**
 * Splits `total` into `parts` shares that always sum back to the total: the
 * remainder is distributed one minor unit at a time instead of rounding each
 * share independently (Decision 017) — dividing 100 into 3 yields 34/33/33,
 * never 33.33 three times.
 */
export const allocate = (total: Money, parts: number): Result<Money[], MoneyError> => {
  if (!Number.isInteger(parts) || parts <= 0) {
    return err({
      code: 'amount_out_of_range',
      message: 'Money can only be allocated into a positive integer number of parts.',
    })
  }

  const sign = total.amountMinor < 0 ? -1 : 1
  const magnitude = Math.abs(total.amountMinor)
  const base = Math.floor(magnitude / parts)
  const remainder = magnitude % parts

  const shares = Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0))

  return ok(shares.map((share) => ({ amountMinor: sign * share, currency: total.currency })))
}
