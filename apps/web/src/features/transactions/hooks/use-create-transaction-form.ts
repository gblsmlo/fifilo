import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { type FieldValues, type UseFormReturn, useForm } from 'react-hook-form'

import { transactionFeedback } from '../feedback'
import { createTransaction } from '../http/create-transaction'
import { TransactionRequestError } from '../http/errors'
import { civilDateToday } from '../resolve-this-month'
import {
  type ExpenseFormInput,
  type ExpenseFormValues,
  type IncomeFormInput,
  type IncomeFormValues,
  type TransferFormInput,
  type TransferFormValues,
  expenseFormSchema,
  incomeFormSchema,
  transferFormSchema,
} from '../schemas/transaction-form'

export interface UseCreateTransactionFormParams {
  onCreated?: () => void
  /** `workspace_settings.timezone` (Fase 06 § Modelagem) - defaults to the workspace's own default while it has not loaded yet, never the viewer's UTC clock. */
  timezone?: string
}

/** Empty notes go through as `undefined` so the API's `?? null` default applies, not a stored empty string. */
const cleanNotes = <T extends { notes?: string | null }>(values: T): T => ({
  ...values,
  notes: values.notes?.trim() ? values.notes.trim() : undefined,
})

function useSubmitTransaction<Values extends FieldValues>(
  form: UseFormReturn<Values, unknown, Values>,
  onCreated?: () => void,
) {
  const queryClient = useQueryClient()
  // Stable across a retried submit of the same attempt (a slow network, a
  // double click), fresh again after a successful create (Fase 06 audit,
  // NFR-05) - lazily created so a form nobody has submitted yet never claims
  // a key it will not use.
  const idempotencyKeyRef = useRef<string>(undefined)

  return form.handleSubmit(async (values) => {
    idempotencyKeyRef.current ??= crypto.randomUUID()

    try {
      await createTransaction(
        cleanNotes(values as { notes?: string | null }) as never,
        idempotencyKeyRef.current,
      )

      toastManager.add(transactionFeedback.create.success)
      form.reset()
      idempotencyKeyRef.current = undefined
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['accounts', 'balances'] })
      onCreated?.()
    } catch (error) {
      const message =
        error instanceof TransactionRequestError
          ? error.message
          : 'Não foi possível registrar a transação.'
      toastManager.add(transactionFeedback.create.failure(message))
    }
  })
}

export function useCreateExpenseForm({ onCreated, timezone }: UseCreateTransactionFormParams = {}) {
  const form = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    defaultValues: {
      accountId: '',
      amountMinor: 0,
      categoryId: '',
      description: '',
      kind: 'expense',
      notes: '',
      occurredOn: civilDateToday(timezone),
    },
    mode: 'onSubmit',
    resolver: zodResolver(expenseFormSchema),
  })

  return { form, onSubmit: useSubmitTransaction(form, onCreated) }
}

export function useCreateIncomeForm({ onCreated, timezone }: UseCreateTransactionFormParams = {}) {
  const form = useForm<IncomeFormInput, unknown, IncomeFormValues>({
    defaultValues: {
      accountId: '',
      amountMinor: 0,
      categoryId: '',
      description: '',
      kind: 'income',
      notes: '',
      occurredOn: civilDateToday(timezone),
    },
    mode: 'onSubmit',
    resolver: zodResolver(incomeFormSchema),
  })

  return { form, onSubmit: useSubmitTransaction(form, onCreated) }
}

export function useCreateTransferForm({
  onCreated,
  timezone,
}: UseCreateTransactionFormParams = {}) {
  const form = useForm<TransferFormInput, unknown, TransferFormValues>({
    defaultValues: {
      amountMinor: 0,
      description: '',
      fromAccountId: '',
      kind: 'transfer',
      notes: '',
      occurredOn: civilDateToday(timezone),
      toAccountId: '',
    },
    mode: 'onSubmit',
    resolver: zodResolver(transferFormSchema),
  })

  return { form, onSubmit: useSubmitTransaction(form, onCreated) }
}
