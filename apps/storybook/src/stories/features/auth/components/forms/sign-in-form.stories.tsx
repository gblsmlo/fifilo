import { SignInFormFields } from '@features/auth/components/forms/sign-in-form'
import { authFeedback } from '@features/auth/feedback'
import type { SignInFormInput, SignInFormValues } from '@features/auth/hooks/use-sign-in-form'
import { signInFormSchema } from '@features/auth/schemas/sign-in-form'
import { authStoryFixtures } from '@features/auth/storybook/auth-story-fixtures'
import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { withAuthRoute } from '../../../../../test-utils/auth-story-router'
import { withAuthSurface } from '../../../../../test-utils/auth-story-surface'

type SignInSubmit = (values: SignInFormValues) => Promise<void>

const stayPending: SignInSubmit = () => new Promise<void>(() => undefined)

const invalidCredentialsToast = authFeedback.signIn.failure(
  authStoryFixtures.invalidCredentialsMessage,
)

const rejectCredentials: SignInSubmit = async () => {
  toastManager.add(invalidCredentialsToast)
}

const acceptCredentials: SignInSubmit = async () => {
  toastManager.add(authFeedback.signIn.success)
}

const ignoreSubmit: SignInSubmit = async () => undefined

function SignInFrame({
  initialEmail = '',
  onSubmit,
}: Readonly<{ initialEmail?: string; onSubmit: SignInSubmit }>) {
  const form = useForm<SignInFormInput, unknown, SignInFormValues>({
    defaultValues: { email: initialEmail, password: '' },
    resolver: zodResolver(signInFormSchema),
  })

  return (
    <FormProvider {...form}>
      <SignInFormFields
        onSubmit={form.handleSubmit(onSubmit)}
        redirectTo={authStoryFixtures.redirectTo}
      />
    </FormProvider>
  )
}

async function submitCredentials(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await userEvent.type(await canvas.findByLabelText('Email'), authStoryFixtures.email)
  await userEvent.type(await canvas.findByLabelText('Senha'), authStoryFixtures.password)
  await userEvent.click(canvas.getByRole('button', { name: 'Entrar' }))
}

const meta = {
  args: {
    onSubmit: async () => undefined,
    redirectTo: authStoryFixtures.redirectTo,
  },
  component: SignInFormFields,
  decorators: [withAuthSurface, withAuthRoute],
  parameters: {
    // `centered` encolhe a story ate a largura do conteudo, e o limite de 384px do
    // formulario deixaria de ser observavel. A coluna e centrada pelo decorator.
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Superficie de credenciais do login. O formulario nao conhece rede: valida pelo schema, expressa o envio e delega o resultado ao consumer, que emite o toast e navega.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Auth/Password/SignIn',
} satisfies Meta<typeof SignInFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Email')).toBeTruthy()
  },
  render: () => <SignInFrame onSubmit={ignoreSubmit} />,
}

export const WithKnownEmail: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Volta do cadastro ou da recuperacao de senha, quando a rota devolve o e-mail em `?email=`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const email = await within(canvasElement).findByLabelText<HTMLInputElement>('Email')

    await expect(email.value).toBe(authStoryFixtures.email)
  },
  render: () => <SignInFrame initialEmail={authStoryFixtures.email} onSubmit={ignoreSubmit} />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Envio vazio: cada campo mostra a mensagem do schema e nada sai do formulario.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Entrar' }))

    await expect(await canvas.findByText('Informe um e-mail valido.')).toBeTruthy()
    await expect(await canvas.findByText('Informe sua senha.')).toBeTruthy()
  },
  render: () => <SignInFrame onSubmit={ignoreSubmit} />,
}

export const Submitting: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Com a autenticacao em voo o botao assume o indicador e bloqueia o reenvio.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitCredentials(canvasElement)

    const submit = within(canvasElement).getByRole('button', { name: 'Entrar' })

    await waitFor(async () => {
      await expect(submit.dataset.loading).toBe('')
    })
  },
  render: () => <SignInFrame onSubmit={stayPending} />,
}

export const InvalidCredentials: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Credencial recusada: o erro chega por toast e o formulario segue preenchido para nova tentativa.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitCredentials(canvasElement)

    const body = within(document.body)

    await expect(await body.findByText(invalidCredentialsToast.title)).toBeTruthy()
    await expect(await body.findByText(invalidCredentialsToast.description)).toBeTruthy()
  },
  render: () => <SignInFrame onSubmit={rejectCredentials} />,
}

export const Authenticated: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Sucesso: o toast confirma a sessao antes de o consumer navegar para o destino.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitCredentials(canvasElement)

    await expect(
      await within(document.body).findByText(authFeedback.signIn.success.title),
    ).toBeTruthy()
  },
  render: () => <SignInFrame onSubmit={acceptCredentials} />,
}
