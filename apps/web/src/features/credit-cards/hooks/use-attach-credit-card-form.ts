import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { creditCardFeedback } from '../feedback'
import { attachCreditCard } from '../http/attach-credit-card'
import { CreditCardRequestError } from '../http/errors'
import {
  type AttachCreditCardFormInput,
  type AttachCreditCardFormValues,
  attachCreditCardFormSchema,
} from '../schemas/attach-credit-card-form'

export type {
  AttachCreditCardFormInput,
  AttachCreditCardFormValues,
} from '../schemas/attach-credit-card-form'

export interface UseAttachCreditCardFormParams {
  accountId: string
  onAttached?: () => void
}

export function useAttachCreditCardForm({ accountId, onAttached }: UseAttachCreditCardFormParams) {
  const queryClient = useQueryClient()
  const form = useForm<AttachCreditCardFormInput, unknown, AttachCreditCardFormValues>({
    defaultValues: { closingDay: 1, dueDay: 10, limitMinor: 0 },
    mode: 'onSubmit',
    resolver: zodResolver(attachCreditCardFormSchema),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await attachCreditCard(accountId, values)

      toastManager.add(creditCardFeedback.attach.success)
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['credit-cards', accountId] })
      onAttached?.()
    } catch (error) {
      const message =
        error instanceof CreditCardRequestError
          ? error.message
          : 'Não foi possível cadastrar o cartão.'

      toastManager.add(creditCardFeedback.attach.failure(message))
    }
  })

  return { form, onSubmit }
}
