import {
  OPENING_BALANCE_DATE_ERROR,
  createAccountRequestObjectSchema,
  openingBalanceHasDate,
} from '@fifilo/core/accounts'
import type { z } from 'zod'

/**
 * `.pick()` returns the plain object, not the `.refine()` wrapper the contract
 * exports, so the rule that ties the opening balance to its date is applied
 * here from the same predicate the contract uses (Decision 002).
 */
export const accountFormSchema = createAccountRequestObjectSchema
  .pick({
    institution: true,
    kind: true,
    name: true,
    openingBalanceDate: true,
    openingBalanceMinor: true,
  })
  .refine(openingBalanceHasDate, {
    error: OPENING_BALANCE_DATE_ERROR,
    path: ['openingBalanceDate'],
  })

export type AccountFormInput = z.input<typeof accountFormSchema>
export type AccountFormValues = z.infer<typeof accountFormSchema>
