import { AccountFormFields } from '@features/accounts/components/forms/account-form'
import type {
  AccountFormInput,
  AccountFormValues,
} from '@features/accounts/hooks/use-create-account-form'
import { accountFormSchema } from '@features/accounts/schemas/account-form'
import {
  OnboardingCompletion,
  SetupReminder,
  WorkspaceSettingsSetupFields,
  type WorkspaceSetupInput,
  workspaceSettingsSetupSchema,
} from '@features/onboarding'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, within } from 'storybook/test'

import { withOnboardingRoute } from '../../../test-utils/auth-story-router'

const settings = {
  currency: 'BRL',
  locale: 'pt-BR',
  monthStartDay: 1,
  organizationId: 'org_story',
  timezone: 'America/Sao_Paulo',
  updatedAt: null,
  version: 0,
  weekStartsOn: 'monday',
} as const

const withQueryState = (data: Record<string, unknown>) => (Story: () => ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  for (const [key, value] of Object.entries(data)) queryClient.setQueryData(JSON.parse(key), value)
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  )
}

function WorkspaceSettingsSetupFrame() {
  const form = useForm<WorkspaceSetupInput>({
    defaultValues: {
      currency: settings.currency,
      locale: settings.locale,
      timezone: settings.timezone,
      version: settings.version,
    },
    resolver: zodResolver(workspaceSettingsSetupSchema),
  })

  return (
    <FormProvider {...form}>
      <WorkspaceSettingsSetupFields onSubmit={form.handleSubmit(async () => undefined)} />
    </FormProvider>
  )
}

function FirstAccountForm() {
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
      <AccountFormFields onSubmit={form.handleSubmit(async () => undefined)} />
    </FormProvider>
  )
}

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs', 'storybook-test'],
  title: 'Onboarding/FinancialSetup',
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const WorkspaceSettings: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A região chega detectada e o passo pede confirmação. Os três campos existem, atrás de "Alterar", para quem está configurando o workspace de outro lugar.',
      },
    },
  },
  render: () => <WorkspaceSettingsSetupFrame />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('Detectamos sua região')).toBeTruthy()
    await expect(await canvas.findByRole('button', { name: 'Está certo' })).toBeTruthy()
  },
}

export const WorkspaceSettingsEdited: Story = {
  parameters: {
    docs: {
      description: { story: '"Alterar" abre as três escolhas que a detecção preencheu.' },
    },
  },
  render: () => <WorkspaceSettingsSetupFrame />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Alterar' }))

    await expect(await canvas.findByLabelText('Moeda')).toBeTruthy()
    await expect(await canvas.findByLabelText('Idioma e formato')).toBeTruthy()
    await expect(await canvas.findByLabelText('Fuso horário')).toBeTruthy()
  },
}

export const FirstAccount: Story = {
  render: () => (
    <div className='max-w-xl space-y-4'>
      <h2 className='font-semibold text-xl'>Onde está seu dinheiro hoje?</h2>
      <FirstAccountForm />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByLabelText('Nome')).toBeTruthy()
    await expect(await canvas.findByLabelText('Tipo')).toBeTruthy()
    await expect(await canvas.findByLabelText('Instituição (opcional)')).toBeTruthy()
  },
}

export const Completion: Story = {
  decorators: [
    withOnboardingRoute,
    withQueryState({
      '["accounts","balances"]': {
        accounts: [{ accountId: 'acc_story', balance: { amountMinor: 428_000, currency: 'BRL' } }],
        consolidated: { amountMinor: 428_000, currency: 'BRL' },
      },
    }),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'O desfecho é o saldo da pessoa, não a palavra "concluído": é o que prova que o setup produziu algo verdadeiro.',
      },
    },
  },
  render: () => <OnboardingCompletion />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText(/Seu saldo: R\$\s*4\.280,00/)).toBeTruthy()
    await expect(await canvas.findByRole('link', { name: 'Registrar um lançamento' })).toBeTruthy()
  },
}

export const SkippedReminder: Story = {
  decorators: [
    withOnboardingRoute,
    withQueryState({
      '["onboarding"]': {
        complete: false,
        dismissed: true,
        eligible: true,
        organizationId: 'org_story',
        reminderVisible: true,
        steps: { firstAccount: false, workspaceSettings: true },
      },
    }),
  ],
  render: () => <SetupReminder />,
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText('Falta pouco para o painel fazer sentido'),
    ).toBeTruthy()
  },
}
