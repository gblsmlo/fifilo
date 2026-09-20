import { TransactionsToolbar } from '@features/transactions/components/transactions-toolbar'
import { CollectionProvider } from '@fifilo/patterns/collection-views'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { expect, fn, screen, userEvent, within } from 'storybook/test'

type TransactionsToolbarProps = Parameters<typeof TransactionsToolbar>[0]

const accounts = [
  { id: 'acc_checking', name: 'Conta corrente' },
  { id: 'acc_wallet', name: 'Carteira' },
]

const categories = [
  { id: 'cat_market', name: 'Mercado' },
  { id: 'cat_transport', name: 'Transporte' },
]

/**
 * The toolbar composes inside `CollectionProvider`, which the route owns: the
 * search field registers in the toolbar's roving focus and the view settings
 * write back to the URL contract.
 */
function TransactionsToolbarExample(props: Readonly<TransactionsToolbarProps>): ReactElement {
  return (
    <CollectionProvider
      collection={{ getKey: () => '', getLabel: () => '', groupings: [], items: [] }}
      defaultPreferences={{ groupBy: null, view: 'datagrid' }}
    >
      <TransactionsToolbar {...props} />
    </CollectionProvider>
  )
}

const meta = {
  args: {
    accounts,
    categories,
    from: '2026-09-01',
    onCreate: fn(),
    onSearchChange: fn(),
    search: {},
    to: '2026-09-30',
  },
  component: TransactionsToolbarExample,
  parameters: {
    docs: {
      description: {
        component:
          'A toolbar da coleção de transações: busca, período em Popover, filtros de tipo, conta e categoria em um único menu de exibição, e a inclusão à direita. Todo o estado é o da URL da rota.',
      },
    },
    layout: 'padded',
  },
  tags: ['autodocs'],
  title: 'Transactions/TransactionsToolbar',
} satisfies Meta<typeof TransactionsToolbarExample>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // One trigger for every filter, the period included; the search is the only
    // control the toolbar keeps in the open.
    await expect(await canvas.findByRole('searchbox', { name: 'Buscar transações' })).toBeTruthy()
    await expect(await canvas.findByRole('button', { name: 'Exibição' })).toBeTruthy()
  },
}

export const WithActiveFilters: Story = {
  args: { search: { from: '2026-09-10', kind: 'expense', q: 'mercado' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The count in the trigger label is the filters', never the layout's, and a
    // period narrowed from the default counts as one.
    await expect(await canvas.findByRole('button', { name: 'Exibição (3)' })).toBeTruthy()
  },
}

export const FilterByKind: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Exibição' }))
    // The menu is portalled outside the canvas.
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Tipo' }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Receita' }))

    await expect(args.onSearchChange).toHaveBeenCalledWith({ kind: 'income' })
  },
}

export const PeriodPresets: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Exibição' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Período' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Mês passado' }))

    // The preset lands on the URL contract as civil dates, never as instants.
    await expect(args.onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
  },
}
