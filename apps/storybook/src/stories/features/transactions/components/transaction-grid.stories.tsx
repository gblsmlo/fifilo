import { TransactionGrid } from '@features/transactions/components/transaction-grid'
import { type CollectionDefinition, CollectionProvider } from '@fifilo/patterns/collection-views'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { expect, fn, screen, userEvent, within } from 'storybook/test'

type TransactionGridProps = Parameters<typeof TransactionGrid>[0]
type TransactionResponse = TransactionGridProps['transactions'][number]

const collectionOf = (
  transactions: readonly TransactionResponse[],
): CollectionDefinition<TransactionResponse> => ({
  getKey: (transaction) => transaction.id,
  getLabel: (transaction) => transaction.description,
  groupings: [],
  items: transactions,
})

/**
 * The grid reads the view from `CollectionProvider`, which the route owns. The
 * story mounts the same provider so the outlet resolves to the datagrid.
 */
function TransactionGridExample(
  props: Readonly<Omit<TransactionGridProps, 'collection'>>,
): ReactElement {
  const collection = collectionOf(props.transactions)

  return (
    <CollectionProvider
      collection={collection}
      defaultPreferences={{ groupBy: null, view: 'datagrid' }}
    >
      <TransactionGrid {...props} collection={collection} />
    </CollectionProvider>
  )
}

const meta = {
  args: {
    accounts: [],
    categories: [],
    onChange: fn(),
    onDelete: fn(),
    transactions: [],
  },
  component: TransactionGridExample,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A coleção de lançamentos no modo datagrid, agrupando as pernas de cada transação por conta. A toolbar e os filtros vivem na rota; aqui ficam os estados do widget e as colunas.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Transactions/TransactionGrid',
} satisfies Meta<typeof TransactionGridExample>

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
    accounts: [
      { id: 'acc_checking', name: 'Conta corrente' },
      { id: 'acc_wallet', name: 'Carteira' },
    ],
    categories: [
      { id: 'cat_market', kind: 'expense', name: 'Mercado' },
      { id: 'cat_transport', kind: 'expense', name: 'Transporte' },
      { id: 'cat_salary', kind: 'income', name: 'Salário' },
    ],
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

export const ChangesTheCategoryInline: Story = {
  args: WithTransactions.args,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // The accessible name carries the current value, so the row is named by it.
    await userEvent.click(await canvas.findByRole('combobox', { name: 'Categoria: Mercado' }))
    // Search, list and the create command are portalled outside the canvas.
    await expect(await screen.findByPlaceholderText('Buscar categoria')).toBeTruthy()
    await expect(await screen.findByRole('button', { name: 'Nova categoria' })).toBeTruthy()
    await userEvent.click(await screen.findByRole('option', { name: 'Transporte' }))

    await expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'txn_1' }), {
      accountId: 'acc_checking',
      categoryId: 'cat_transport',
      kind: 'expense',
    })
  },
}

/** A transfer has no category to change: the contract gives it none. */
export const TransferHasNoCategory: Story = {
  args: WithTransactions.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // One editable category in the grid, the expense's; the transfer's is a
    // read surface, and with no value its name is the property alone.
    await expect(canvas.getAllByRole('combobox', { name: /^Categoria/ })).toHaveLength(1)
    await expect(await canvas.findByRole('img', { name: 'Categoria' })).toBeTruthy()
    await expect(await canvas.findByText('Sem categoria')).toBeTruthy()
  },
}

/**
 * A kind change carries what the new kind needs: an income takes an account and
 * a category of its own kind, and the contract takes neither without them.
 */
export const ChangesTheKindInline: Story = {
  args: WithTransactions.args,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('combobox', { name: 'Tipo: Despesa' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Receita' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'Mudar para receita' }))
    await userEvent.click(await dialog.findByRole('combobox', { name: 'Categoria' }))
    // Only the income categories, because only they fit the kind being chosen.
    await expect(screen.queryByRole('option', { name: 'Mercado' })).toBeNull()
    await userEvent.click(await screen.findByRole('option', { name: 'Salário' }))
    await userEvent.click(await dialog.findByRole('button', { name: 'Salvar' }))

    await expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'txn_1' }), {
      accountId: 'acc_checking',
      categoryId: 'cat_salary',
      kind: 'income',
    })
  },
}

/** Becoming a transfer asks for the account the money reaches, and drops the category. */
export const ChangesToTransfer: Story = {
  args: WithTransactions.args,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('combobox', { name: 'Tipo: Despesa' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Transferência' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'Mudar para transferência' }))
    await userEvent.click(await dialog.findByRole('combobox', { name: 'Conta de destino' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Carteira' }))
    await userEvent.click(await dialog.findByRole('button', { name: 'Salvar' }))

    await expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'txn_1' }), {
      fromAccountId: 'acc_checking',
      kind: 'transfer',
      toAccountId: 'acc_wallet',
    })
  },
}

/** A transfer can leave its kind too, and then it needs an account and a category. */
export const TransferChangesKind: Story = {
  args: WithTransactions.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('combobox', { name: 'Tipo: Transferência' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Despesa' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'Mudar para despesa' }))
    await expect(await dialog.findByRole('combobox', { name: 'Conta' })).toBeTruthy()
    await expect(await dialog.findByRole('combobox', { name: 'Categoria' })).toBeTruthy()
  },
}

/** One account in the workspace is no choice, so the row reads it instead. */
export const ChangesTheAccountInline: Story = {
  args: WithTransactions.args,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('combobox', { name: 'Conta: Conta corrente' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Carteira' }))

    await expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'txn_1' }), {
      accountId: 'acc_wallet',
      categoryId: 'cat_market',
      kind: 'expense',
    })
  },
}

export const ChangesTheDateInline: Story = {
  args: WithTransactions.args,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const [trigger] = await canvas.findAllByRole('button', { name: /^Data: / })

    await userEvent.click(trigger as HTMLElement)
    // The calendar is portalled outside the canvas, and its day buttons are
    // named by the whole date, not by the number they print.
    await userEvent.click(await screen.findByRole('button', { name: /January 20th, 2026/ }))

    // The rest of the row travels with the new day, because the contract
    // replaces the whole transaction per edit.
    await expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'txn_1' }), {
      accountId: 'acc_checking',
      categoryId: 'cat_market',
      kind: 'expense',
      occurredOn: '2026-01-20',
    })
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
