import { z } from 'zod'

import { MONEY_AMOUNT_MINOR_MAX } from '../primitives'

/**
 * ISO 4217 codes the currency table in `primitives.ts` knows the exponent
 * for. Kept here, not derived from `Object.keys`, so the contract stays a
 * literal union Eden and the Web can narrow on.
 */
export const currencyCodeSchema = z.enum(['BHD', 'BRL', 'EUR', 'GBP', 'JPY', 'USD'])

/**
 * The wire shape of `Money` (Decision 017): a signed integer in minor units,
 * bounded to the range a JavaScript number carries exactly. A value outside
 * it is a `422` at the boundary, never a silent overflow.
 */
export const moneySchema = z.object({
  amountMinor: z.int().min(-MONEY_AMOUNT_MINOR_MAX).max(MONEY_AMOUNT_MINOR_MAX),
  currency: currencyCodeSchema,
})

export type CurrencyCodeContract = z.infer<typeof currencyCodeSchema>
export type MoneyContract = z.infer<typeof moneySchema>
