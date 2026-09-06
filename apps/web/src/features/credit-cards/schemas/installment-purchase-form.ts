import { createInstallmentPurchaseRequestSchema } from '@fifilo/core/credit-cards'
import type { z } from 'zod'

export const installmentPurchaseFormSchema = createInstallmentPurchaseRequestSchema

export type InstallmentPurchaseFormInput = z.input<typeof installmentPurchaseFormSchema>
export type InstallmentPurchaseFormValues = z.infer<typeof installmentPurchaseFormSchema>
