import { InstallmentPurchaseFormFields } from '@features/credit-cards/components/forms/installment-purchase-form'
import type {
  InstallmentPurchaseFormInput,
  InstallmentPurchaseFormValues,
} from '@features/credit-cards/schemas/installment-purchase-form'
import { installmentPurchaseFormSchema } from '@features/credit-cards/schemas/installment-purchase-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, within } from 'storybook/test'

const categoryOptions = [{ id: 'cat_shopping', name: 'Compras' }]

function InstallmentPurchaseFormFrame({
  defaultValues,
}: Readonly<{ defaultValues?: Partial<InstallmentPurchaseFormInput> }>) {
  const form = useForm<InstallmentPurchaseFormInput, unknown, InstallmentPurchaseFormValues>({
    defaultValues: {
      accountId: 'acc_card',
      categoryId: '',
      description: '',
      firstOccurredOn: '',
      installments: 2,
      totalMinor: 0,
      ...defaultValues,
    },
    resolver: zodResolver(installmentPurchaseFormSchema),
  })

  const preview =
    defaultValues?.totalMinor && defaultValues.installments
      ? [
          { amountMinor: -3_334, installmentNumber: 1, occurredOn: '2026-06-05' },
          { amountMinor: -3_333, installmentNumber: 2, occurredOn: '2026-07-05' },
          { amountMinor: -3_333, installmentNumber: 3, occurredOn: '2026-08-05' },
        ]
      : []

  return (
    <FormProvider {...form}>
      <InstallmentPurchaseFormFields
        categoryOptions={categoryOptions}
        currency='BRL'
        onSubmit={form.handleSubmit(async () => undefined)}
        preview={preview}
      />
    </FormProvider>
  )
}

const meta = {
  args: {
    categoryOptions,
    currency: 'BRL',
    onSubmit: async () => undefined,
    preview: [],
  },
  component: InstallmentPurchaseFormFields,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Compra parcelada no cartão: as parcelas calculadas aparecem antes de salvar (Fase 03 § Web).',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'CreditCards/InstallmentPurchaseForm',
} satisfies Meta<typeof InstallmentPurchaseFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Descrição')).toBeTruthy()
  },
  render: () => <InstallmentPurchaseFormFrame />,
}

export const WithPreview: Story = {
  parameters: {
    docs: {
      description: {
        story: 'O usuário confere o rateio de cada parcela antes de confirmar a compra.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByTestId('installment-preview')).toBeTruthy()
    await expect(await canvas.findByText('1/3 — 2026-06-05')).toBeTruthy()
  },
  render: () => (
    <InstallmentPurchaseFormFrame defaultValues={{ installments: 3, totalMinor: 10_000 }} />
  ),
}

export const ValidationErrors: Story = {
  parameters: {
    docs: { description: { story: 'Envio vazio: a descrição é obrigatória.' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Registrar compra parcelada' }))

    await expect(await canvas.findByText('Informe uma descrição.')).toBeTruthy()
  },
  render: () => <InstallmentPurchaseFormFrame />,
}
