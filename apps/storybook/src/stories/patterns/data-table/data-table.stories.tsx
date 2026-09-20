import { DataTable, type DataTableColumn } from '@fifilo/patterns/data-table'
import { Badge } from '@fifilo/ui/components/badge'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

type Row = { id: string; name: string; status: 'open' | 'paid'; total: string }

const rows: Row[] = [
  { id: 'jan', name: 'Janeiro', status: 'paid', total: 'R$ 1.200,00' },
  { id: 'fev', name: 'Fevereiro', status: 'paid', total: 'R$ 980,00' },
  { id: 'mar', name: 'Março', status: 'open', total: 'R$ 640,00' },
]

const columns: DataTableColumn<Row>[] = [
  { cell: (row) => <span className='font-medium'>{row.name}</span>, header: 'Mês', id: 'name' },
  {
    cell: (row) => (
      <Badge variant={row.status === 'paid' ? 'success' : 'default'}>
        {row.status === 'paid' ? 'Paga' : 'Aberta'}
      </Badge>
    ),
    header: 'Status',
    id: 'status',
  },
  { align: 'end', cell: (row) => row.total, header: 'Total', id: 'total' },
]

const meta = {
  args: {
    caption: 'Faturas',
    columns,
    rowKey: (row: Row) => row.id,
    rows,
  },
  argTypes: {
    columns: { control: false },
    footer: { control: false },
    onRowSelect: { control: false },
    rowKey: { control: false },
    rows: { control: false },
  },
  component: DataTable<Row>,
  decorators: [
    (Story) => (
      <div className='w-full max-w-2xl p-6'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A tabela em cartão das particles de tabela do Coss (`variant="card"`), neutra do que é uma linha: a vitrine declara colunas e células, o shell é dono do cabeçalho, dos estados de linha e da linha de resumo. Carregando, vazio e erro não são assunto dela — `Widget` guarda esses estados antes da tabela montar.',
      },
    },
    layout: 'padded',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'DataTable',
} satisfies Meta<typeof DataTable<Row>>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('table', { name: 'Faturas' })).toBeTruthy()
    await expect(canvas.getAllByRole('row')).toHaveLength(4)
    await expect(canvas.getByRole('row', { name: /Março.*Aberta.*640,00/ })).toBeTruthy()
  },
}

/** A linha de resumo do `p-table-7`: o rótulo atravessa as colunas que não nomeia. */
export const WithFooter: Story = {
  args: {
    footer: ['Total', 'R$ 2.820,00'],
  },
  play: async ({ canvasElement }) => {
    const footer = canvasElement.querySelector('tfoot')
    await expect(footer).toHaveTextContent('Total')
    await expect(footer?.querySelector('td')?.getAttribute('colspan')).toBe('2')
  },
}

export const Selectable: Story = {
  args: {
    onRowSelect: fn(),
    selectedRowKey: 'fev',
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    const selected = canvas.getByRole('row', { name: /Fevereiro/ })
    await expect(selected).toHaveAttribute('data-state', 'selected')

    const target = canvas.getByRole('row', { name: /Março/ })
    await userEvent.click(target)
    await expect(args.onRowSelect).toHaveBeenLastCalledWith(rows[2])

    target.focus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onRowSelect).toHaveBeenCalledTimes(2)
  },
}
