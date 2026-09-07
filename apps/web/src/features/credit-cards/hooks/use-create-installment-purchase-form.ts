import { type InstallmentShare, buildInstallmentShares } from '@fifilo/core/credit-cards'
import type { CurrencyCode } from '@fifilo/core/primitives'
import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { creditCardFeedback } from '../feedback'
import { createInstallmentPurchase } from '../http/create-installment-purchase'
import { CreditCardRequestError } from '../http/errors'
import {
  type InstallmentPurchaseFormInput,
  type InstallmentPurchaseFormValues,
  installmentPurchaseFormSchema,
} from '../schemas/installment-purchase-form'

export type {
  InstallmentPurchaseFormInput,
  InstallmentPurchaseFormValues,
} from '../schemas/installment-purchase-form'

export interface UseCreateInstallmentPurchaseFormParams {
  accountId: string
  currency: CurrencyCode
  onCreated?: () => void
}

/**
 * `preview` mirrors the exact allocation the API will persist - same
 * function, same inputs (Fase 03 § Web: the user confere o rateio, não
 * confia). It is empty, not an error, while the form is still incomplete.
 */
export function useCreateInstallmentPurchaseForm({
  accountId,
  currency,
  onCreated,
}: UseCreateInstallmentPurchaseFormParams) {
  const queryClient = useQueryClient()
  const form = useForm<InstallmentPurchaseFormInput, unknown, InstallmentPurchaseFormValues>({
    defaultValues: {
      accountId,
      categoryId: '',
      description: '',
      firstOccurredOn: '',
      installments: 2,
      totalMinor: 0,
    },
    mode: 'onSubmit',
    resolver: zodResolver(installmentPurchaseFormSchema),
  })

  const totalMinor = form.watch('totalMinor')
  const installments = form.watch('installments')
  const firstOccurredOn = form.watch('firstOccurredOn')

  const preview: InstallmentShare[] = useMemo(() => {
    if (!totalMinor || !installments || installments < 1 || !firstOccurredOn) return []
    const result = buildInstallmentShares(
      { amountMinor: totalMinor, currency },
      installments,
      firstOccurredOn,
    )
    return result.ok ? result.value : []
  }, [currency, firstOccurredOn, installments, totalMinor])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createInstallmentPurchase(values)

      toastManager.add(creditCardFeedback.installmentPurchase.success)
      form.reset({
        accountId,
        categoryId: '',
        description: '',
        firstOccurredOn: '',
        installments: 2,
        totalMinor: 0,
      })
      await queryClient.invalidateQueries({ queryKey: ['credit-cards', accountId] })
      onCreated?.()
    } catch (error) {
      const message =
        error instanceof CreditCardRequestError
          ? error.message
          : 'Não foi possível registrar a compra.'

      toastManager.add(creditCardFeedback.installmentPurchase.failure(message))
    }
  })

  return { form, onSubmit, preview }
}
