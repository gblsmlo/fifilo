import { IncomeExpenseFormFields } from '@features/transactions/components/forms/transaction-form-fields'
import type {
  ExpenseFormInput,
  ExpenseFormValues,
  IncomeFormInput,
  IncomeFormValues,
} from '@features/transactions/schemas/transaction-form'
import {
  expenseFormSchema,
  incomeFormSchema,
} from '@features/transactions/schemas/transaction-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, within } from 'storybook/test'

const accountOptions = [
  { id: 'acc_checking', name: 'Conta corrente' },
  { id: 'acc_wallet', name: 'Carteira' },
]

const expenseCategoryOptions = [
  { id: 'cat_market', name: 'Mercado' },
  { id: 'cat_transport', name: 'Transporte' },
]

const incomeCategoryOptions = [
  { id: 'cat_salary', name: 'Salário' },
  { id: 'cat_freelance', name: 'Freelance' },
]

function ExpenseFormFrame() {
  const form = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    defaultValues: {
      accountId: '',
      amountMinor: 0,
      categoryId: '',
      description: '',
      kind: 'expense',
      notes: '',
      occurredOn: '2026-01-15',
    },
    resolver: zodResolver(expenseFormSchema),
  })

  return (
    <FormProvider {...form}>
      <IncomeExpenseFormFields
        accountOptions={accountOptions}
        categoryOptions={expenseCategoryOptions}
        onSubmit={form.handleSubmit(() => undefined)}
        submitLabel='Registrar despesa'
      />
    </FormProvider>
  )
}

function IncomeFormFrame() {
  const form = useForm<IncomeFormInput, unknown, IncomeFormValues>({
    defaultValues: {
      accountId: '',
      amountMinor: 0,
      categoryId: '',
      description: '',
      kind: 'income',
      notes: '',
      occurredOn: '2026-01-15',
    },
    resolver: zodResolver(incomeFormSchema),
  })

  return (
    <FormProvider {...form}>
      <IncomeExpenseFormFields
        accountOptions={accountOptions}
        categoryOptions={incomeCategoryOptions}
        onSubmit={form.handleSubmit(() => undefined)}
        submitLabel='Registrar receita'
      />
    </FormProvider>
  )
}

const meta = {
  args: {
    accountOptions,
    categoryOptions: expenseCategoryOptions,
    onSubmit: async () => undefined,
    submitLabel: 'Registrar despesa',
  },
  component: IncomeExpenseFormFields,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Campos de despesa e receita: mesmo componente, categorias filtradas pelo tipo da aba (Fase 02 § Web).',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Transactions/TransactionFormFields',
} satisfies Meta<typeof IncomeExpenseFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Expense: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Descrição')).toBeTruthy()
  },
  render: () => <ExpenseFormFrame />,
}

export const Income: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('Salário')).toBeTruthy()
    await expect(await canvas.findByRole('button', { name: 'Registrar receita' })).toBeTruthy()
  },
  render: () => <IncomeFormFrame />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: { story: 'Envio vazio: descrição, conta e categoria são obrigatórias.' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Registrar despesa' }))

    await expect(await canvas.findByText('Informe uma descrição.')).toBeTruthy()
  },
  render: () => <ExpenseFormFrame />,
}
