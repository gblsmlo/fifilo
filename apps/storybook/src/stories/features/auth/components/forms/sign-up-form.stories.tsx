import { SignUpFormFields } from '@features/auth/components/forms/sign-up-form'
import { authFeedback } from '@features/auth/feedback'
import type { SignUpFormInput, SignUpFormValues } from '@features/auth/hooks/use-sign-up-form'
import { signUpFormSchema } from '@features/auth/schemas/sign-up-form'
import { authStoryFixtures } from '@features/auth/storybook/auth-story-fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { toastManager } from '@twincam/ui/components/toast'
import { FormProvider, type UseFormReturn, useForm } from 'react-hook-form'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { withAuthSurface } from '../../../../../test-utils/auth-story-surface'

type SignUpForm = UseFormReturn<SignUpFormInput, unknown, SignUpFormValues>
type SignUpSubmit = (form: SignUpForm) => Promise<void>

const accountCreatedToast = authFeedback.signUp.success(authStoryFixtures.signUpMessage)
const unreachableToast = authFeedback.signUp.failure(authStoryFixtures.unreachableMessage)

const ignoreSubmit: SignUpSubmit = async () => undefined

const stayPending: SignUpSubmit = () => new Promise<void>(() => undefined)

const createAccount: SignUpSubmit = async () => {
  toastManager.add(accountCreatedToast)
}

const failToReachServer: SignUpSubmit = async () => {
  toastManager.add(unreachableToast)
}

/**
 * Conflito de e-mail e a unica falha de servidor que o cadastro devolve para
 * dentro do campo, e nao para o toast: o usuario corrige ali mesmo.
 */
const rejectDuplicatedEmail: SignUpSubmit = async (form) => {
  form.setError('email', { message: authStoryFixtures.conflictMessage, type: 'server' })
}

function SignUpFrame({ onSubmit }: Readonly<{ onSubmit: SignUpSubmit }>) {
  const form = useForm<SignUpFormInput, unknown, SignUpFormValues>({
    defaultValues: { confirmPassword: '', email: '', name: '', password: '' },
    resolver: zodResolver(signUpFormSchema),
  })

  return (
    <FormProvider {...form}>
      <SignUpFormFields onSubmit={form.handleSubmit(() => onSubmit(form))} />
    </FormProvider>
  )
}

async function fillAccount(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await userEvent.type(await canvas.findByLabelText('Nome'), authStoryFixtures.name)
  await userEvent.type(canvas.getByLabelText('Email'), authStoryFixtures.email)
  await userEvent.type(canvas.getByLabelText('Senha'), authStoryFixtures.password)
  await userEvent.type(canvas.getByLabelText('Confirmar senha'), authStoryFixtures.password)
  await userEvent.click(canvas.getByRole('button', { name: 'Criar conta' }))
}

const meta = {
  args: {
    onSubmit: async () => undefined,
  },
  component: SignUpFormFields,
  decorators: [withAuthSurface],
  parameters: {
    // `centered` encolhe a story ate a largura do conteudo, e o limite de 384px do
    // formulario deixaria de ser observavel. A coluna e centrada pelo decorator.
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cadastro de conta. Sem confirmacao de senha: PasswordStrength mostra os requisitos em tempo real e o toggle "Mostrar senha" cobre a verificacao. O conflito de e-mail volta do servidor para o proprio campo.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Auth/Password/SignUp',
} satisfies Meta<typeof SignUpFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Nome')).toBeTruthy()
  },
  render: () => <SignUpFrame onSubmit={ignoreSubmit} />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Envio vazio: os tres campos mostram a mensagem do schema de cadastro.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Criar conta' }))

    await expect(await canvas.findByText('Informe seu nome.')).toBeTruthy()
    await expect(await canvas.findByText('Informe um e-mail valido.')).toBeTruthy()
    await expect(
      await canvas.findByText('A senha precisa ter pelo menos 12 caracteres.'),
    ).toBeTruthy()
  },
  render: () => <SignUpFrame onSubmit={ignoreSubmit} />,
}

export const PasswordProgress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A senha ganha um medidor: a barra avanca conforme as linhas sao atendidas. So o comprimento reprova o envio; as outras tres sao recomendacao, e por isso aparecem como progresso e nao como erro.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const meter = canvas.getByRole('progressbar', { name: 'Força da senha' })

    await expect(meter.getAttribute('aria-valuenow')).toBe('0')

    await userEvent.type(await canvas.findByLabelText('Senha'), 'ana123')

    await waitFor(async () => {
      await expect(meter.getAttribute('aria-valuenow')).toBe('2')
    })

    await userEvent.type(canvas.getByLabelText('Senha'), '-office-demo!')

    await waitFor(async () => {
      await expect(meter.getAttribute('aria-valuenow')).toBe('4')
    })
  },
  render: () => <SignUpFrame onSubmit={ignoreSubmit} />,
}

export const Submitting: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Com o cadastro em voo o botao assume o indicador e bloqueia o reenvio.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await fillAccount(canvasElement)

    const submit = within(canvasElement).getByRole('button', { name: 'Criar conta' })

    await waitFor(async () => {
      await expect(submit.dataset.loading).toBe('')
    })
  },
  render: () => <SignUpFrame onSubmit={stayPending} />,
}

export const EmailAlreadyRegistered: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Conflito no servidor: a mensagem volta para o campo de e-mail, nao para o toast.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await fillAccount(canvasElement)

    await expect(
      await within(canvasElement).findByText(authStoryFixtures.conflictMessage),
    ).toBeTruthy()
  },
  render: () => <SignUpFrame onSubmit={rejectDuplicatedEmail} />,
}

export const AccountCreated: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sucesso: o toast repete a mensagem do servidor antes de o consumer voltar ao login.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await fillAccount(canvasElement)

    const body = within(document.body)

    await expect(await body.findByText(accountCreatedToast.title)).toBeTruthy()
    await expect(await body.findByText(accountCreatedToast.description)).toBeTruthy()
  },
  render: () => <SignUpFrame onSubmit={createAccount} />,
}

export const ServerUnreachable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Falha sem campo responsavel: o erro vai para o toast e o formulario segue editavel.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await fillAccount(canvasElement)

    await expect(await within(document.body).findByText(unreachableToast.title)).toBeTruthy()
  },
  render: () => <SignUpFrame onSubmit={failToReachServer} />,
}
