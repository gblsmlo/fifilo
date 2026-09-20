import { DataTable } from '@fifilo/patterns/data-table'
import type { StateSurfaceProps, SurfaceGuardState } from '@fifilo/patterns/state-surface'
import { Widget, WidgetPanel, type WidgetProps } from '@fifilo/patterns/widget'
import { Button } from '@fifilo/ui/components/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlusIcon } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { expect, within } from 'storybook/test'
import { stateSurfaceKindArgType } from '../../../test-utils/story-arg-types'

type Row = { id: string; name: string; total: string }

const rows: Row[] = [
  { id: 'mercado', name: 'Mercado', total: 'R$ 750,00' },
  { id: 'transporte', name: 'Transporte', total: 'R$ 250,00' },
  { id: 'lazer', name: 'Lazer', total: 'R$ 120,00' },
]

const table = (
  <DataTable
    caption='Gasto por categoria'
    columns={[
      { cell: (row: Row) => row.name, header: 'Categoria', id: 'name' },
      { align: 'end', cell: (row: Row) => row.total, header: 'Total', id: 'total' },
    ]}
    footer={['Total', 'R$ 1.120,00']}
    rowKey={(row) => row.id}
    rows={rows}
  />
)

/**
 * `WidgetProps` pairs `state` with `surface` in a union; Storybook's `Partial`
 * over a union collapses to `never`, so the controls are typed flat here and
 * the render narrows back to the component's contract.
 */
interface WidgetStoryArgs {
  action?: ReactNode
  children?: ReactNode
  className?: string
  description?: ReactNode
  footer?: ReactNode
  state?: SurfaceGuardState
  surface?: Omit<StateSurfaceProps, 'kind'>
  title: ReactNode
}

const meta = {
  args: {
    description: 'Total gasto por categoria no período.',
    title: 'Gasto por categoria',
  },
  argTypes: {
    action: { control: false },
    children: { control: false },
    footer: { control: false },
    state: {
      control: 'select',
      options: ['data', 'loading', ...stateSurfaceKindArgType.kind.options],
    },
    surface: { control: false },
  },
  component: Widget as ComponentType<WidgetStoryArgs>,
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
          'A moldura de painel das particles `CardFrame` do Coss: cabeçalho com título, descrição e ação, corpo e rodapé. O corpo é uma `DataTable` deitada direto na moldura (`p-table-7`, `p-table-8`) ou um `WidgetPanel` em volta de gráfico, formulário ou conteúdo livre (`p-card-5`, `p-card-11`). Com `state` e `surface`, qualquer estado que não seja `data` troca o corpo pelo tratamento do `StateGuard` dentro de um painel, sem redeclarar estado.',
      },
    },
    layout: 'padded',
  },
  render: (args) => <Widget {...(args as WidgetProps)} />,
  tags: ['autodocs', 'storybook-test'],
  title: 'Widget',
} satisfies Meta<WidgetStoryArgs>

export default meta

type Story = StoryObj<typeof meta>

export const WithTable: Story = {
  args: {
    action: (
      <Button size='sm' variant='outline'>
        <PlusIcon />
        Nova
      </Button>
    ),
    children: table,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const region = canvas.getByRole('region', { name: 'Gasto por categoria' })
    await expect(within(region).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Gasto por categoria',
    )
    await expect(within(region).getByRole('table', { name: 'Gasto por categoria' })).toBeTruthy()
    await expect(within(region).getByRole('button', { name: 'Nova' })).toBeTruthy()
    // A tabela deita direto na moldura: nenhum painel entre as duas.
    await expect(canvasElement.querySelector('[data-slot="widget-panel"]')).toBeNull()
  },
}

export const WithPanel: Story = {
  args: {
    children: (
      <WidgetPanel>
        <p className='text-sm'>Um gráfico, um formulário ou qualquer conteúdo livre.</p>
      </WidgetPanel>
    ),
    footer: <p className='text-muted-foreground text-sm'>Atualizado agora</p>,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="widget-panel"]')).not.toBeNull()
    await expect(canvasElement.querySelector('[data-slot="widget-footer"]')).toHaveTextContent(
      'Atualizado agora',
    )
  },
}

export const Loading: Story = {
  args: {
    children: table,
    state: 'loading',
    surface: { description: 'Buscando o gasto do período.', title: 'Carregando' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toBeTruthy()
    await expect(canvas.queryByRole('table')).toBeNull()
  },
}

export const Empty: Story = {
  args: {
    children: table,
    state: 'empty',
    surface: { description: 'Sem gasto no período selecionado.', title: 'Nenhum gasto' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Nenhum gasto')).toBeTruthy()
    await expect(canvas.queryByRole('table')).toBeNull()
  },
}

export const Failure: Story = {
  args: {
    children: table,
    state: 'error',
    surface: {
      actions: [{ label: 'Tentar novamente', onPress: () => undefined }],
      description: 'Não foi possível carregar o gasto por categoria.',
      title: 'Falha ao carregar',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('alert')).toBeTruthy()
    await expect(canvas.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy()
  },
}
