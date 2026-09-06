import { AttachCreditCardFormFields } from '@features/credit-cards/components/forms/attach-credit-card-form'
import type {
  AttachCreditCardFormInput,
  AttachCreditCardFormValues,
} from '@features/credit-cards/schemas/attach-credit-card-form'
import { attachCreditCardFormSchema } from '@features/credit-cards/schemas/attach-credit-card-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, within } from 'storybook/test'

function AttachCreditCardFormFrame() {
  const form = useForm<AttachCreditCardFormInput, unknown, AttachCreditCardFormValues>({
    defaultValues: { closingDay: 1, dueDay: 10, limitMinor: 0 },
    resolver: zodResolver(attachCreditCardFormSchema),
  })

  return (
    <FormProvider {...form}>
      <AttachCreditCardFormFields onSubmit={form.handleSubmit(async () => undefined)} />
    </FormProvider>
  )
}

const meta = {
  args: {
    onSubmit: async () => undefined,
  },
  component: AttachCreditCardFormFields,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Cadastro do cartão: dia de fechamento, dia de vencimento e limite.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'CreditCards/AttachCreditCardForm',
} satisfies Meta<typeof AttachCreditCardFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Dia de fechamento')).toBeTruthy()
  },
  render: () => <AttachCreditCardFormFrame />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: { story: 'Envio com limite zerado: o contrato exige um valor positivo.' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Cadastrar cartão' }))

    await expect(await canvas.findByText('O valor deve ser maior que zero.')).toBeTruthy()
  },
  render: () => <AttachCreditCardFormFrame />,
}
