import {
  Action,
  CollectionToolbar,
  DataGrid,
  type DataGridColumnDef,
  DataGridColumnsSubmenu,
  type DataGridDensity,
  DataGridDensitySubmenu,
  DataGridSearch,
  DataGridSortSubmenu,
  ViewSettingsMenu,
  ViewSettingsSection,
  createSelectColumn,
  useDataGrid,
} from '@fifilo/patterns/collection-views'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ReactElement, useMemo, useState } from 'react'
import { expect } from 'storybook/test'
import { booleanArgType } from '../../../../test-utils/story-arg-types'

interface MechanicsRecord {
  amount: number
  id: string
  name: string
  owner: string
  stage: string
  updatedAt: string
}

const records: MechanicsRecord[] = [
  {
    amount: 1200,
    id: 'record-1',
    name: 'First item',
    owner: 'Ana',
    stage: 'Aberto',
    updatedAt: '2026-08-04',
  },
  {
    amount: 860,
    id: 'record-2',
    name: 'Second item',
    owner: 'Ana',
    stage: 'Aberto',
    updatedAt: '2026-08-11',
  },
  {
    amount: 2400,
    id: 'record-3',
    name: 'Third item',
    owner: 'Bruno',
    stage: 'Em análise',
    updatedAt: '2026-08-18',
  },
  {
    amount: 310,
    id: 'record-4',
    name: 'Fourth item',
    owner: 'Bruno',
    stage: 'Concluído',
    updatedAt: '2026-08-25',
  },
  {
    amount: 1750,
    id: 'record-5',
    name: 'Fifth item',
    owner: 'Carla',
    stage: 'Concluído',
    updatedAt: '2026-08-29',
  },
]

const columns: DataGridColumnDef<MechanicsRecord>[] = [
  {
    accessorKey: 'name',
    enableHiding: false,
    header: 'Name',
    meta: { label: 'Name', type: 'text' },
    minSize: 200,
  },
  {
    accessorKey: 'stage',
    header: 'Etapa',
    meta: { label: 'Etapa', type: 'status', variant: 'badge' },
    minSize: 150,
  },
  {
    accessorKey: 'owner',
    header: 'Responsável',
    meta: { label: 'Responsável', type: 'person' },
    minSize: 150,
  },
  {
    accessorKey: 'amount',
    header: 'Valor',
    meta: { align: 'end', label: 'Valor', type: 'number', variant: 'number' },
    minSize: 120,
  },
  {
    accessorKey: 'updatedAt',
    header: 'Atualizado em',
    meta: { label: 'Atualizado em', type: 'last-edited-time', variant: 'date' },
    minSize: 160,
  },
]

interface DataGridExampleProps {
  /** Densidade vertical das linhas. */
  density?: DataGridDensity
  /** Troca as linhas por esqueletos de carregamento. */
  isLoading?: boolean
  /** Agrupa linhas consecutivas que compartilham o responsável. */
  grouped?: boolean
  /** Liga a coluna de seleção e a caixa de seleção por linha. */
  selectable?: boolean
  /** Pagina no cliente. O rodapé de paginação vem junto, sem wiring extra. */
  paginated?: boolean
  /** Renderiza a toolbar de busca, filtro, ordenação, densidade e colunas. */
  withToolbar?: boolean
  /** Coleção exibida. Passe uma lista vazia para ver a mensagem de vazio. */
  data?: MechanicsRecord[]
  /** Teto de altura. Sem ele o grid tem a altura do conteúdo; com ele, rola por dentro. */
  maxHeight?: number
}

/**
 * Compõe `useDataGrid` e `DataGrid` do jeito que um consumidor compõe: o hook
 * monta a tabela, o grid desenha, e a toolbar e a paginação são opcionais.
 */
function DataGridExample({
  data = records,
  density,
  grouped = false,
  isLoading = false,
  maxHeight,
  paginated = false,
  selectable = false,
  withToolbar = false,
}: Readonly<DataGridExampleProps>): ReactElement {
  const { table } = useDataGrid<MechanicsRecord>({
    columns: selectable ? [createSelectColumn<MechanicsRecord>(), ...columns] : columns,
    data,
    enablePagination: paginated,
    enableRowSelection: selectable,
    getRowId: (record) => record.id,
    pageSize: 3,
  })

  return (
    <div className='flex min-w-0 flex-col gap-2 p-4'>
      {withToolbar ? (
        <CollectionToolbar
          aria-label='Ações da coleção'
          endSlot={
            <>
              <ViewSettingsMenu
                activeFilterCount={table.getState().globalFilter ? 1 : 0}
                onClearFilters={() => table.setGlobalFilter('')}
              >
                <ViewSettingsSection label='Exibição'>
                  <DataGridSortSubmenu table={table} />
                  <DataGridDensitySubmenu table={table} />
                  <DataGridColumnsSubmenu table={table} />
                </ViewSettingsSection>
              </ViewSettingsMenu>
              <Action label='Novo item' onClick={() => undefined} />
            </>
          }
          startSlot={<DataGridSearch placeholder='Buscar…' table={table} />}
        />
      ) : null}
      <DataGrid
        aria-label='Coleção'
        density={density}
        emptyMessage='Nenhum item para exibir.'
        getRowGroup={grouped ? (record) => record.owner : undefined}
        isLoading={isLoading}
        maxHeight={maxHeight}
        table={table}
      />
    </div>
  )
}

const meta = {
  argTypes: {
    density: {
      control: 'select',
      options: ['short', 'medium', 'tall', 'extra-tall'],
    },
    grouped: booleanArgType,
    isLoading: booleanArgType,
    paginated: booleanArgType,
    selectable: booleanArgType,
    withToolbar: booleanArgType,
  },
  component: DataGridExample,
  parameters: {
    docs: {
      description: {
        component:
          'Building Block de DataGrid. Documenta cabeçalho de coluna, densidade, agrupamento, seleção, paginação, carregamento e vazio — sem fixtures nem vocabulário de nenhuma feature. A tabela vem de `useDataGrid`; o consumidor é dono das colunas.',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Patterns/Collections/Views/DataGrid',
} satisfies Meta<typeof DataGridExample>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithToolbar: Story = { args: { withToolbar: true } }

export const Paginated: Story = { args: { paginated: true } }

export const Grouped: Story = { args: { grouped: true } }

export const Selectable: Story = { args: { selectable: true } }

const stageOptions = [
  { label: 'Aberto', value: 'Aberto' },
  { label: 'Em análise', value: 'Em análise' },
  { label: 'Concluído', value: 'Concluído' },
]

const ownerOptions = [
  { label: 'Ana', value: 'Ana' },
  { label: 'Bruno', value: 'Bruno' },
  { label: 'Carla', value: 'Carla' },
]

/**
 * Colunas de valor fechado viram property com trigger: o Badge abre o Select e
 * emite `onCellValueChange`. A mutação continua sendo do consumer — o grid não
 * escreve na coleção, só avisa o que mudou.
 */
function EditableExample(): ReactElement {
  const [rows, setRows] = useState(records)

  const editableColumns = useMemo<DataGridColumnDef<MechanicsRecord>[]>(
    () => [
      columns[0] as DataGridColumnDef<MechanicsRecord>,
      {
        accessorKey: 'stage',
        header: 'Etapa',
        meta: {
          editable: true,
          label: 'Etapa',
          options: stageOptions,
          type: 'status',
          variant: 'select',
        },
        minSize: 170,
      },
      {
        accessorKey: 'owner',
        header: 'Responsável',
        meta: {
          badgeVariant: 'outline',
          editable: true,
          label: 'Responsável',
          options: ownerOptions,
          type: 'person',
          variant: 'select',
        },
        minSize: 170,
      },
      ...columns.slice(3),
    ],
    [],
  )

  const { table } = useDataGrid<MechanicsRecord>({
    columns: editableColumns,
    data: rows,
    getRowId: (record) => record.id,
    onCellValueChange: ({ columnId, rowId, value }) =>
      setRows((current) =>
        current.map((record) => (record.id === rowId ? { ...record, [columnId]: value } : record)),
      ),
  })

  return (
    <div className='p-4'>
      <DataGrid aria-label='Coleção' table={table} />
    </div>
  )
}

export const EditableValues: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Etapa e Responsável são valores fechados, então a célula vira property com trigger: o Badge abre o Select e o grid emite `onCellValueChange`. Quem escreve na coleção é o consumer.',
      },
    },
  },
  render: () => <EditableExample />,
}

/**
 * A última coluna absorve a sobra horizontal, senão o grid terminaria antes da
 * borda. `fillColumn` escolhe outra coluna, ou `false` desliga o preenchimento e
 * cada coluna fica com a largura declarada.
 */
function FillExample({ fillColumn }: Readonly<{ fillColumn?: string | false }>): ReactElement {
  const { table } = useDataGrid<MechanicsRecord>({
    columns,
    data: records.slice(0, 3),
    getRowId: (record) => record.id,
  })

  return <DataGrid aria-label='Coleção' fillColumn={fillColumn} table={table} />
}

export const FillColumn: Story = {
  play: async ({ canvasElement }) => {
    // Scrolling beyond the content opens an empty strip on the right that reads
    // as one more column: the last column's resize handle was adding 8px.
    for (const grid of canvasElement.querySelectorAll('[data-slot="data-grid"]')) {
      const viewport = grid.querySelector('[data-slot="scroll-area-viewport"]')
      const body = grid.querySelector('[data-slot="data-grid-body"]')
      const header = grid.querySelector('[data-slot="data-grid-header"]')
      if (!(viewport && body && header)) throw new Error('grid não montou')

      await expect(viewport.scrollWidth).toBe(body.scrollWidth)
      await expect(header.scrollWidth).toBe(body.scrollWidth)
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'Por omissão a última coluna cresce para fechar a moldura. `fillColumn` move esse papel para outra coluna. Com `false` nenhuma cresce e a moldura encolhe para a soma das colunas — esticar ali deixaria uma faixa sem borda à direita, que se lê como coluna fantasma. Passando das colunas o container, o grid rola.',
      },
    },
  },
  render: () => (
    <div className='flex flex-col gap-6 p-4'>
      {(
        [
          ['Padrão: a última coluna cresce', undefined],
          ["fillColumn='name': a primeira cresce", 'name'],
          ['fillColumn={false}: nenhuma cresce, a moldura encolhe', false],
        ] as const
      ).map(([label, fillColumn]) => (
        <div className='flex flex-col gap-1' key={label}>
          <p className='font-medium text-muted-foreground text-sm'>{label}</p>
          <FillExample fillColumn={fillColumn} />
        </div>
      ))}
    </div>
  ),
}

export const Densities: Story = {
  render: () => (
    <div className='flex flex-col gap-6 p-4'>
      {(['short', 'medium', 'tall', 'extra-tall'] as const).map((density) => (
        <div className='flex flex-col gap-1' key={density}>
          <p className='font-medium text-muted-foreground text-sm'>{density}</p>
          <DataGridExample data={records.slice(0, 3)} density={density} />
        </div>
      ))}
    </div>
  ),
}

/** Com `maxHeight` o grid para de crescer e passa a rolar por dentro, com o
 *  cabeçalho grudado. */
export const Scrollable: Story = { args: { maxHeight: 160, withToolbar: true } }

export const Loading: Story = { args: { isLoading: true } }

export const Empty: Story = { args: { data: [] } }
