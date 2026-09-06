import { TransactionList } from '@features/transactions/components/transaction-list'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

const meta = {
  args: {
    accountNamesById: new Map(),
    categoryNamesById: new Map(),
    onDelete: fn(),
    transactions: [],
  },
  component: TransactionList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Lista paginada por cursor, agrupando as pernas de cada transação por conta.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Transactions/TransactionList',
} satisfies Meta<typeof TransactionList>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText('Nenhuma transação no período'),
    ).toBeTruthy()
  },
}

export const WithTransactions: Story = {
  args: {
    accountNamesById: new Map([
      ['acc_checking', 'Conta corrente'],
      ['acc_wallet', 'Carteira'],
    ]),
    categoryNamesById: new Map([['cat_market', 'Mercado']]),
    transactions: [
      {
        categoryId: 'cat_market',
        createdAt: '2026-01-15T12:00:00.000Z',
        description: 'Supermercado',
        id: 'txn_1',
        kind: 'expense',
        legs: [{ accountId: 'acc_checking', amountMinor: -5_000 }],
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: 'org_story',
        updatedAt: '2026-01-15T12:00:00.000Z',
        version: 1,
      },
      {
        categoryId: null,
        createdAt: '2026-01-16T12:00:00.000Z',
        description: 'Reserva mensal',
        id: 'txn_2',
        kind: 'transfer',
        legs: [
          { accountId: 'acc_checking', amountMinor: -20_000 },
          { accountId: 'acc_wallet', amountMinor: 20_000 },
        ],
        notes: null,
        occurredOn: '2026-01-16',
        organizationId: 'org_story',
        updatedAt: '2026-01-16T12:00:00.000Z',
        version: 1,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('Supermercado')).toBeTruthy()
    await expect(await canvas.findByText('Reserva mensal')).toBeTruthy()
  },
}

export const ErrorState: Story = {
  args: {
    error: { message: 'Não foi possível falar com o servidor. Tente novamente.' },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        'Não foi possível falar com o servidor. Tente novamente.',
      ),
    ).toBeTruthy()
  },
}
