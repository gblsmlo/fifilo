import { accountsQueryOptions } from '@features/accounts'
import { categoriesQueryOptions } from '@features/categories'
import { Dialog } from '@fifilo/patterns/dialog'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@fifilo/ui/components/tabs'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FormProvider } from 'react-hook-form'

import {
  useCreateExpenseForm,
  useCreateIncomeForm,
  useCreateTransferForm,
} from '../../hooks/use-create-transaction-form'
import { IncomeExpenseFormFields, TransferFormFields } from './transaction-form-fields'

type TransactionTab = 'expense' | 'income' | 'transfer'

const TAB_LABELS: Record<TransactionTab, string> = {
  expense: 'Despesa',
  income: 'Receita',
  transfer: 'Transferência',
}

interface TransactionDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
}

/**
 * One dialog, three tabs: the tab swaps `TransactionFormFields`' schema and
 * fields, never the component itself (Fase 02 § Web). Each tab keeps its own
 * form instance, so switching tabs never discards what the other one holds.
 */
export function TransactionDialog({ onOpenChange, open }: Readonly<TransactionDialogProps>) {
  const [tab, setTab] = useState<TransactionTab>('expense')
  const accountsQuery = useQuery(accountsQueryOptions())
  const categoriesQuery = useQuery(categoriesQueryOptions())

  const close = () => onOpenChange(false)
  const accountOptions = (accountsQuery.data ?? [])
    .filter((account) => !account.archivedAt)
    .map((account) => ({ id: account.id, name: account.name }))

  const expenseForm = useCreateExpenseForm({ onCreated: close })
  const incomeForm = useCreateIncomeForm({ onCreated: close })
  const transferForm = useCreateTransferForm({ onCreated: close })

  const categoryOptionsFor = (kind: 'expense' | 'income') =>
    (categoriesQuery.data ?? [])
      .filter((category) => category.kind === kind && !category.archivedAt)
      .map((category) => ({ id: category.id, name: category.name }))

  return (
    <Dialog onOpenChange={onOpenChange} open={open} size='lg' title='Nova transação'>
      <Tabs onValueChange={(value) => setTab(value as TransactionTab)} value={tab}>
        <TabsList>
          {(Object.keys(TAB_LABELS) as TransactionTab[]).map((value) => (
            <TabsTab key={value} value={value}>
              {TAB_LABELS[value]}
            </TabsTab>
          ))}
        </TabsList>

        <TabsPanel value='expense'>
          <FormProvider {...expenseForm.form}>
            <IncomeExpenseFormFields
              accountOptions={accountOptions}
              categoryOptions={categoryOptionsFor('expense')}
              onSubmit={expenseForm.onSubmit}
              submitLabel='Registrar despesa'
            />
          </FormProvider>
        </TabsPanel>

        <TabsPanel value='income'>
          <FormProvider {...incomeForm.form}>
            <IncomeExpenseFormFields
              accountOptions={accountOptions}
              categoryOptions={categoryOptionsFor('income')}
              onSubmit={incomeForm.onSubmit}
              submitLabel='Registrar receita'
            />
          </FormProvider>
        </TabsPanel>

        <TabsPanel value='transfer'>
          <FormProvider {...transferForm.form}>
            <TransferFormFields accountOptions={accountOptions} onSubmit={transferForm.onSubmit} />
          </FormProvider>
        </TabsPanel>
      </Tabs>
    </Dialog>
  )
}
