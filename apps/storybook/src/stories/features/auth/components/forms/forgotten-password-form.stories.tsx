import { ForgottenPasswordFormFields } from '@features/auth/components/forms/forgotten-password-form'
import { authFeedback } from '@features/auth/feedback'
import type {
  ForgottenPasswordFormInput,
  ForgottenPasswordFormValues,
} from '@features/auth/hooks/use-request-password-reset-form'
import { forgottenPasswordFormSchema } from '@features/auth/schemas/forgotten-password-form'
import { authStoryFixtures } from '@features/auth/storybook/auth-story-fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { toastManager } from '@twincam/ui/components/toast'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { withAuthSurface } from '../../../../../test-utils/auth-story-surface'

type ForgottenPasswordSubmit = () => Promise<void>

const linkSentToast = authFeedback.requestPasswordReset.success
const requestFailedToast = authFeedback.requestPasswordReset.failure(
  authStoryFixtures.unreachableMessage,
)

const ignoreSubmit: ForgottenPasswordSubmit = async () => undefined

const stayPending: ForgottenPasswordSubmit = () => new Promise<void>(() => undefined)

const sendLink: ForgottenPasswordSubmit = async () => {
  toastManager.add(linkSentToast)
}

const failToSendLink: ForgottenPasswordSubmit = async () => {
  toastManager.add(requestFailedToast)
}

function ForgottenPasswordFrame({
  initialEmail = '',
  onSubmit,
}: Readonly<{ initialEmail?: string; onSubmit: ForgottenPasswordSubmit }>) {
  const form = useForm<ForgottenPasswordFormInput, unknown, ForgottenPasswordFormValues>({
    defaultValues: { email: initialEmail },
    resolver: zodResolver(forgottenPasswordFormSchema),
  })

  return (
    <FormProvider {...form}>
      <ForgottenPasswordFormFields onSubmit={form.handleSubmit(() => onSubmit())} />
    </FormProvider>
  )
}

async function requestLink(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await userEvent.type(await canvas.findByLabelText('Email'), authStoryFixtures.email)
  await userEvent.click(canvas.getByRole('button', { name: 'Enviar link' }))
}

const meta = {
  args: {
    onSubmit: async () => undefined,
  },
  component: ForgottenPasswordFormFields,
  decorators: [withAuthSurface],
  parameters: {
    // `centered` encolhe a story ate a largura do conteudo, e o limite de 384px do
    // formulario deixaria de ser observavel. A coluna e centrada pelo decorator.
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Pedido de link de recuperacao. O sucesso e deliberadamente neutro: o toast nao revela se o e-mail existe.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Auth/Password/ForgottenPassword',
} satisfies Meta<typeof ForgottenPasswordFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Email')).toBeTruthy()
  },
  render: () => <ForgottenPasswordFrame onSubmit={ignoreSubmit} />,
}

export const WithKnownEmail: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Chegada pelo link do login, que repassa o e-mail ja digitado em `?email=`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const email = await within(canvasElement).findByLabelText<HTMLInputElement>('Email')

    await expect(email.value).toBe(authStoryFixtures.email)
  },
  render: () => (
    <ForgottenPasswordFrame initialEmail={authStoryFixtures.email} onSubmit={ignoreSubmit} />
  ),
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Envio vazio: sem e-mail valido o pedido nao sai do formulario.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Enviar link' }))

    await expect(await canvas.findByText('Informe um e-mail valido.')).toBeTruthy()
  },
  render: () => <ForgottenPasswordFrame onSubmit={ignoreSubmit} />,
}

export const Submitting: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Com o pedido em voo o botao assume o indicador e bloqueia o reenvio.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await requestLink(canvasElement)

    const submit = within(canvasElement).getByRole('button', { name: 'Enviar link' })

    await waitFor(async () => {
      await expect(submit.dataset.loading).toBe('')
    })
  },
  render: () => <ForgottenPasswordFrame onSubmit={stayPending} />,
}

export const LinkSent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sucesso: o toast confirma o envio sem afirmar que a conta existe, e o consumer volta ao login.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await requestLink(canvasElement)

    const body = within(document.body)

    await expect(await body.findByText(linkSentToast.title)).toBeTruthy()
    await expect(await body.findByText(linkSentToast.description)).toBeTruthy()
  },
  render: () => <ForgottenPasswordFrame onSubmit={sendLink} />,
}

export const RequestFailed: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Falha de envio: o erro chega por toast e o e-mail continua no campo.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await requestLink(canvasElement)

    await expect(await within(document.body).findByText(requestFailedToast.title)).toBeTruthy()
  },
  render: () => <ForgottenPasswordFrame onSubmit={failToSendLink} />,
}
