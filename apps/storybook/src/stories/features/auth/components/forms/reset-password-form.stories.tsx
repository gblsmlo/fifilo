import { ResetPasswordFormFields } from '@features/auth/components/forms/reset-password-form'
import { authFeedback } from '@features/auth/feedback'
import type {
  ResetPasswordFormInput,
  ResetPasswordFormValues,
} from '@features/auth/hooks/use-reset-password-form'
import { resetPasswordFormSchema } from '@features/auth/schemas/reset-password-form'
import { authStoryFixtures } from '@features/auth/storybook/auth-story-fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { toastManager } from '@twincam/ui/components/toast'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { withAuthSurface } from '../../../../../test-utils/auth-story-surface'

type ResetPasswordSubmit = () => Promise<void>

const passwordUpdatedToast = authFeedback.resetPassword.success
const tokenRejectedToast = authFeedback.resetPassword.failure(authStoryFixtures.expiredTokenMessage)

const ignoreSubmit: ResetPasswordSubmit = async () => undefined

const stayPending: ResetPasswordSubmit = () => new Promise<void>(() => undefined)

const updatePassword: ResetPasswordSubmit = async () => {
  toastManager.add(passwordUpdatedToast)
}

const rejectToken: ResetPasswordSubmit = async () => {
  toastManager.add(tokenRejectedToast)
}

function ResetPasswordFrame({ onSubmit }: Readonly<{ onSubmit: ResetPasswordSubmit }>) {
  const form = useForm<ResetPasswordFormInput, unknown, ResetPasswordFormValues>({
    defaultValues: { confirmPassword: '', newPassword: '' },
    resolver: zodResolver(resetPasswordFormSchema),
  })

  return (
    <FormProvider {...form}>
      <ResetPasswordFormFields onSubmit={form.handleSubmit(() => onSubmit())} />
    </FormProvider>
  )
}

async function submitNewPassword(canvasElement: HTMLElement, confirmPassword: string) {
  const canvas = within(canvasElement)

  await userEvent.type(await canvas.findByLabelText('Nova senha'), authStoryFixtures.password)
  await userEvent.type(canvas.getByLabelText('Confirmar senha'), confirmPassword)
  await userEvent.click(canvas.getByRole('button', { name: 'Atualizar senha' }))
}

const meta = {
  args: {
    onSubmit: async () => undefined,
  },
  component: ResetPasswordFormFields,
  decorators: [withAuthSurface],
  parameters: {
    // `centered` encolhe a story ate a largura do conteudo, e o limite de 384px do
    // formulario deixaria de ser observavel. A coluna e centrada pelo decorator.
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Fim do fluxo de recuperacao. O token vive na rota e nunca aparece no formulario; a tela so decide a nova senha.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Auth/Password/ResetPassword',
} satisfies Meta<typeof ResetPasswordFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Nova senha')).toBeTruthy()
  },
  render: () => <ResetPasswordFrame onSubmit={ignoreSubmit} />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Envio vazio: o comprimento minimo e a confirmacao aparecem antes de qualquer request.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Atualizar senha' }))

    await expect(
      await canvas.findByText('A senha precisa ter pelo menos 12 caracteres.'),
    ).toBeTruthy()
    await expect(await canvas.findByText('Confirme sua nova senha.')).toBeTruthy()
  },
  render: () => <ResetPasswordFrame onSubmit={ignoreSubmit} />,
}

export const PasswordMismatch: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A divergencia entre as duas senhas aparece no campo de confirmacao.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitNewPassword(canvasElement, 'outra-senha-demo-123')

    await expect(
      await within(canvasElement).findByText('As senhas precisam coincidir.'),
    ).toBeTruthy()
  },
  render: () => <ResetPasswordFrame onSubmit={ignoreSubmit} />,
}

export const Submitting: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Com a troca em voo o botao assume o indicador e bloqueia o reenvio.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitNewPassword(canvasElement, authStoryFixtures.password)

    const submit = within(canvasElement).getByRole('button', { name: 'Atualizar senha' })

    await waitFor(async () => {
      await expect(submit.dataset.loading).toBe('')
    })
  },
  render: () => <ResetPasswordFrame onSubmit={stayPending} />,
}

export const PasswordUpdated: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Sucesso: o toast confirma a troca e o consumer devolve o usuario ao login.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitNewPassword(canvasElement, authStoryFixtures.password)

    const body = within(document.body)

    await expect(await body.findByText(passwordUpdatedToast.title)).toBeTruthy()
    await expect(await body.findByText(passwordUpdatedToast.description)).toBeTruthy()
  },
  render: () => <ResetPasswordFrame onSubmit={updatePassword} />,
}

export const TokenRejected: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Token expirado ou ja usado: a falha e do link, nao dos campos, entao o erro fica no toast.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitNewPassword(canvasElement, authStoryFixtures.password)

    const body = within(document.body)

    await expect(await body.findByText(tokenRejectedToast.title)).toBeTruthy()
    await expect(await body.findByText(authStoryFixtures.expiredTokenMessage)).toBeTruthy()
  },
  render: () => <ResetPasswordFrame onSubmit={rejectToken} />,
}
