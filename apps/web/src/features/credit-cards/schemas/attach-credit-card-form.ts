import { attachCreditCardRequestSchema } from '@fifilo/core/credit-cards'
import type { z } from 'zod'

export const attachCreditCardFormSchema = attachCreditCardRequestSchema

export type AttachCreditCardFormInput = z.input<typeof attachCreditCardFormSchema>
export type AttachCreditCardFormValues = z.infer<typeof attachCreditCardFormSchema>
