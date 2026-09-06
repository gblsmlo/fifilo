import { createAccountRequestObjectSchema } from '@fifilo/core/accounts'
import type { z } from 'zod'

/**
 * The opening balance is part of the contract (it can seed the account's
 * first entry) but this form does not expose it yet: capturing a monetary
 * amount needs a masked input that edits the integer, never the displayed
 * text (Decision 017), which is its own delivery. The account is created
 * with a zero balance; a transaction can fund it once Fase 02 ships.
 */
export const accountFormSchema = createAccountRequestObjectSchema.pick({
  institution: true,
  kind: true,
  name: true,
})

export type AccountFormInput = z.input<typeof accountFormSchema>
export type AccountFormValues = z.infer<typeof accountFormSchema>
