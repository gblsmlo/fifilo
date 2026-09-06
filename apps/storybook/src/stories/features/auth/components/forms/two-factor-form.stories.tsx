import { TwoFactorFormFields } from '@features/auth/components/forms/two-factor-form'
import { authFeedback } from '@features/auth/feedback'
import type {
  TwoFactorFormInput,
  TwoFactorFormValues,
} from '@features/auth/hooks/use-two-factor-form'
import { twoFactorFormSchema } from '@features/auth/schemas/two-factor-form'
import { authStoryFixtures } from '@features/auth/storybook/auth-story-fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { toastManager } from '@twincam/ui/components/toast'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { withAuthSurface } from '../../../../../test-utils/auth-story-surface'

type TwoFactorSubmit = () => Promise<void>

const accessGrantedToast = authFeedback.twoFactor.success
const invalidCodeToast = authFeedback.twoFactor.failure(authStoryFixtures.invalidTotpMessage)

const ignoreSubmit: TwoFactorSubmit = async () => undefined

const stayPending: TwoFactorSubmit = () => new Promise<void>(() => undefined)

const grantAccess: TwoFactorSubmit = async () => {
  toastManager.add(accessGrantedToast)
}

const rejectCode: TwoFactorSubmit = async () => {
  toastManager.add(invalidCodeToast)
}

function TwoFactorFrame({ onSubmit }: Readonly<{ onSubmit: TwoFactorSubmit }>) {
  const form = useForm<TwoFactorFormInput, unknown, TwoFactorFormValues>({
    defaultValues: { code: '' },
    resolver: zodResolver(twoFactorFormSchema),
  })

  return (
    <FormProvider {...form}>
      <TwoFactorFormFields onSubmit={form.handleSubmit(() => onSubmit())} />
    </FormProvider>
  )
}

async function submitCode(canvasElement: HTMLElement, code: string) {
  const canvas = within(canvasElement)

  await userEvent.type(await canvas.findByLabelText('Codigo TOTP'), code)
  await userEvent.click(canvas.getByRole('button', { name: 'Verificar codigo' }))
}

const meta = {
  args: {
    onSubmit: async () => undefined,
  },
  component: TwoFactorFormFields,
  decorators: [withAuthSurface],
  parameters: {
    // `centered` encolhe a story ate a largura do conteudo, e o limite de 384px do
    // formulario deixaria de ser observavel. A coluna e centrada pelo decorator.
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Segundo fator do login. O campo aceita de 6 a 8 digitos e recusa qualquer caractere que nao seja numero.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Auth/TwoFactor',
} satisfies Meta<typeof TwoFactorFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByLabelText('Codigo TOTP')).toBeTruthy()
  },
  render: () => <TwoFactorFrame onSubmit={ignoreSubmit} />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Envio vazio: o comprimento minimo bloqueia a verificacao, e o erro toma o lugar da dica do campo.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Verificar codigo' }))

    await expect(await canvas.findByText('Informe o codigo de 6 digitos.')).toBeTruthy()
  },
  render: () => <TwoFactorFrame onSubmit={ignoreSubmit} />,
}

export const NonNumericCode: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'O campo e `text` para preservar zeros a esquerda, entao a recusa de letra e do schema, nao do teclado.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitCode(canvasElement, 'abc123')

    await expect(await within(canvasElement).findByText('Use apenas numeros.')).toBeTruthy()
  },
  render: () => <TwoFactorFrame onSubmit={ignoreSubmit} />,
}

export const Submitting: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Com a verificacao em voo o botao assume o indicador e bloqueia o reenvio.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitCode(canvasElement, authStoryFixtures.totpCode)

    const submit = within(canvasElement).getByRole('button', { name: 'Verificar codigo' })

    await waitFor(async () => {
      await expect(submit.dataset.loading).toBe('')
    })
  },
  render: () => <TwoFactorFrame onSubmit={stayPending} />,
}

export const InvalidCode: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Codigo recusado pelo servidor: o erro chega por toast e o campo segue editavel.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitCode(canvasElement, authStoryFixtures.totpCode)

    const body = within(document.body)

    await expect(await body.findByText(invalidCodeToast.title)).toBeTruthy()
    await expect(await body.findByText(authStoryFixtures.invalidTotpMessage)).toBeTruthy()
  },
  render: () => <TwoFactorFrame onSubmit={rejectCode} />,
}

export const AccessGranted: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sucesso: o toast confirma o segundo fator antes de o consumer seguir para o destino.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await submitCode(canvasElement, authStoryFixtures.totpCode)

    const body = within(document.body)

    await expect(await body.findByText(accessGrantedToast.title)).toBeTruthy()
    await expect(await body.findByText(accessGrantedToast.description)).toBeTruthy()
  },
  render: () => <TwoFactorFrame onSubmit={grantAccess} />,
}
