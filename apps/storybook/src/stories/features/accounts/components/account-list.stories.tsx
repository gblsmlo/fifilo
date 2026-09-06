import { AccountList } from '@features/accounts/components/account-list'
import {
  accountsStoryFixtures,
  buildStoryAccount,
} from '@features/accounts/storybook/accounts-story-fixtures'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

const checking = buildStoryAccount({ kind: 'checking', name: 'Principal' })
const savings = buildStoryAccount({ kind: 'savings', name: 'Reserva' })

const balances = new Map([
  [checking.id, { amountMinor: 150_000, currency: 'BRL' as const }],
  [savings.id, { amountMinor: 500_000, currency: 'BRL' as const }],
])

const meta = {
  args: {
    accounts: [],
    balancesByAccountId: new Map(),
    onArchive: fn(),
  },
  component: AccountList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Lista de contas agrupada por tipo, com o subtotal do grupo e a ação de arquivar por cartão.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Accounts/AccountList',
} satisfies Meta<typeof AccountList>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Nenhuma conta ainda')).toBeTruthy()
  },
}

export const WithAccounts: Story = {
  args: {
    accounts: [checking, savings],
    balancesByAccountId: balances,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('Principal')).toBeTruthy()
    await expect(await canvas.findByText('Reserva')).toBeTruthy()
    // Each amount below appears twice: once as the account's own balance, once
    // as the subtotal of its single-account group.
    await expect(await canvas.findAllByText('R$ 1.500,00')).toHaveLength(2)
    await expect(await canvas.findAllByText('R$ 5.000,00')).toHaveLength(2)
  },
}

export const ArchiveConfirmation: Story = {
  args: {
    accounts: [checking],
    balancesByAccountId: balances,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Arquivar' }))

    const dialog = within(document.body).getByRole('dialog', { name: 'Arquivar conta?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Arquivar' }))
  },
}

export const ErrorState: Story = {
  args: {
    error: { message: accountsStoryFixtures.unreachableMessage },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(accountsStoryFixtures.unreachableMessage),
    ).toBeTruthy()
  },
}
