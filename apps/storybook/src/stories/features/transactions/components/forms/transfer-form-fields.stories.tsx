import { TransferFormFields } from '@features/transactions/components/forms/transaction-form-fields'
import type {
  TransferFormInput,
  TransferFormValues,
} from '@features/transactions/schemas/transaction-form'
import { transferFormSchema } from '@features/transactions/schemas/transaction-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, within } from 'storybook/test'

const accountOptions = [
  { id: 'acc_checking', name: 'Conta corrente' },
  { id: 'acc_wallet', name: 'Carteira' },
]

function TransferFormFrame() {
  const form = useForm<TransferFormInput, unknown, TransferFormValues>({
    defaultValues: {
      amountMinor: 0,
      description: '',
      fromAccountId: '',
      kind: 'transfer',
      notes: '',
      occurredOn: '2026-01-15',
      toAccountId: '',
    },
    resolver: zodResolver(transferFormSchema),
  })

  return (
    <FormProvider {...form}>
      <TransferFormFields
        accountOptions={accountOptions}
        onSubmit={form.handleSubmit(() => undefined)}
      />
    </FormProvider>
  )
}

const meta = {
  args: {
    accountOptions,
    onSubmit: async () => undefined,
  },
  component: TransferFormFields,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Transferência: duas pernas, sem categoria (Decision 023).',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Transactions/TransferFormFields',
} satisfies Meta<typeof TransferFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Conta de origem')).toBeTruthy()
    await expect(await within(canvasElement).findByLabelText('Conta de destino')).toBeTruthy()
  },
  render: () => <TransferFormFrame />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: { story: 'Envio vazio: descrição e as duas contas são obrigatórias.' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Transferir' }))

    await expect(await canvas.findByText('Informe uma descrição.')).toBeTruthy()
  },
  render: () => <TransferFormFrame />,
}
