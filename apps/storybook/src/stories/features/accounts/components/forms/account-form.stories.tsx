import { AccountFormFields } from '@features/accounts/components/forms/account-form'
import type {
  AccountFormInput,
  AccountFormValues,
} from '@features/accounts/hooks/use-create-account-form'
import { accountFormSchema } from '@features/accounts/schemas/account-form'
import { accountsStoryFixtures } from '@features/accounts/storybook/accounts-story-fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, type UseFormReturn, useForm } from 'react-hook-form'
import { expect, userEvent, within } from 'storybook/test'

type AccountForm = UseFormReturn<AccountFormInput, unknown, AccountFormValues>
type AccountSubmit = (form: AccountForm) => Promise<void>

const ignoreSubmit: AccountSubmit = async () => undefined

const rejectDuplicateName: AccountSubmit = async (form) => {
  form.setError('name', { message: accountsStoryFixtures.nameTakenMessage, type: 'server' })
}

function AccountFormFrame({ onSubmit }: Readonly<{ onSubmit: AccountSubmit }>) {
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    defaultValues: {
      institution: null,
      kind: 'checking',
      name: '',
      openingBalanceDate: '2026-09-21',
      openingBalanceMinor: 0,
    },
    resolver: zodResolver(accountFormSchema),
  })

  return (
    <FormProvider {...form}>
      <AccountFormFields onSubmit={form.handleSubmit(() => onSubmit(form))} />
    </FormProvider>
  )
}

async function fillAccount(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await userEvent.type(await canvas.findByLabelText('Nome'), 'Conta corrente')
  await userEvent.click(canvas.getByRole('button', { name: 'Criar conta' }))
}

const meta = {
  args: {
    onSubmit: async () => undefined,
  },
  component: AccountFormFields,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Formulário de criação de conta. O saldo de abertura edita o inteiro em unidade menor (Decision 017) e exige a data civil em que o saldo vale (Decision 018).',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Accounts/AccountForm',
} satisfies Meta<typeof AccountFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Nome')).toBeTruthy()
  },
  render: () => <AccountFormFrame onSubmit={ignoreSubmit} />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: { story: 'Envio vazio: o nome é obrigatório.' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Criar conta' }))

    await expect(await canvas.findByText('Informe o nome da conta.')).toBeTruthy()
  },
  render: () => <AccountFormFrame onSubmit={ignoreSubmit} />,
}

export const OpeningBalance: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Cada tecla acrescenta um dígito à unidade menor e o campo reformata a partir dela: nenhuma tecla passa por float (Decision 017).',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(await canvas.findByLabelText('Saldo hoje'), '428000')

    await expect(await canvas.findByDisplayValue('4.280,00')).toBeTruthy()
  },
  render: () => <AccountFormFrame onSubmit={ignoreSubmit} />,
}

export const NameAlreadyTaken: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Conflito no servidor: a mensagem volta para o campo de nome, não para o toast.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await fillAccount(canvasElement)

    await expect(
      await within(canvasElement).findByText(accountsStoryFixtures.nameTakenMessage),
    ).toBeTruthy()
  },
  render: () => <AccountFormFrame onSubmit={rejectDuplicateName} />,
}
