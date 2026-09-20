import { AccountList } from '@features/accounts/components/account-list'
import {
  accountsStoryFixtures,
  buildStoryAccount,
} from '@features/accounts/storybook/accounts-story-fixtures'
import { type CollectionDefinition, CollectionProvider } from '@fifilo/patterns/collection-views'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { expect, fn, screen, userEvent, within } from 'storybook/test'

type AccountListProps = Parameters<typeof AccountList>[0]
type Account = AccountListProps['accounts'][number]

const checking = buildStoryAccount({ kind: 'checking', name: 'Principal' })
const savings = buildStoryAccount({ kind: 'savings', name: 'Reserva' })

const balances = new Map([
  [checking.id, { amountMinor: 150_000, currency: 'BRL' as const }],
  [savings.id, { amountMinor: 500_000, currency: 'BRL' as const }],
])

const collectionOf = (accounts: readonly Account[]): CollectionDefinition<Account> => ({
  getKey: (account) => account.id,
  getLabel: (account) => account.name,
  groupings: [],
  items: accounts,
})

/**
 * The list reads the view from `CollectionProvider`, which the route owns. The
 * story mounts the same provider so the outlet resolves to the list, and a
 * query client because the edit form invalidates the accounts on save.
 */
function AccountListExample(props: Readonly<Omit<AccountListProps, 'collection'>>): ReactElement {
  const collection = collectionOf(props.accounts)

  return (
    <QueryClientProvider client={new QueryClient()}>
      <CollectionProvider
        collection={collection}
        defaultPreferences={{ groupBy: null, view: 'list' }}
      >
        <AccountList {...props} collection={collection} />
      </CollectionProvider>
    </QueryClientProvider>
  )
}

const meta = {
  args: {
    accounts: [],
    balancesByAccountId: new Map(),
    onArchive: fn(),
  },
  component: AccountListExample,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A coleção de contas no modo lista: nome e tipo à esquerda, situação e saldo como campos finais, e editar, arquivar e gerenciar cartão atrás do menu de ações.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Accounts/AccountList',
} satisfies Meta<typeof AccountListExample>

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
    await expect(await canvas.findByText('R$ 1.500,00')).toBeTruthy()
    await expect(await canvas.findByText('R$ 5.000,00')).toBeTruthy()
    // An account that takes entries is the norm, so only the archived one
    // carries a badge — and the institution names the avatar.
    await expect(canvas.queryByText('Ativa')).toBeNull()
    await expect(canvas.queryByText('Arquivada')).toBeNull()
  },
}

export const ArchivedAccount: Story = {
  args: {
    accounts: [buildStoryAccount({ archivedAt: '2026-01-10T12:00:00.000Z', name: 'Antiga' })],
    balancesByAccountId: new Map(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('Arquivada')).toBeTruthy()
    // Nothing to archive twice: the menu keeps only what the row can still do.
    await userEvent.click(await canvas.findByRole('button', { name: 'Ações da conta Antiga' }))
    await expect(screen.queryByRole('menuitem', { name: 'Arquivar' })).toBeNull()
  },
}

export const ArchiveConfirmation: Story = {
  args: {
    accounts: [checking],
    balancesByAccountId: balances,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Ações da conta Principal' }))
    // The menu is portalled outside the canvas.
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Arquivar' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'Arquivar conta?' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Arquivar' }))
  },
}

export const EditOpensTheForm: Story = {
  args: {
    accounts: [checking],
    balancesByAccountId: balances,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Ações da conta Principal' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'Editar conta' }))
    // The kind is not in the form: the contract leaves it out of the patch.
    await expect(await dialog.findByLabelText('Nome')).toHaveValue('Principal')
    await expect(dialog.queryByLabelText('Tipo')).toBeNull()
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
