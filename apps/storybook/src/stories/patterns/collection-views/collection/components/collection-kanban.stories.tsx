import {
  KanbanCard,
  KanbanCardDescription,
  KanbanCardFooter,
  KanbanCardHeader,
  KanbanCardTitle,
  type KanbanColumnData,
  KanbanView,
  type KanbanViewProps,
} from '@fifilo/patterns/collection-views'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { booleanArgType } from '../../../../../test-utils/story-arg-types'

interface MechanicsCard {
  description: string
  id: string
  title: string
}

const columns: KanbanColumnData<MechanicsCard>[] = [
  {
    cards: [
      { description: 'A card with a compact shared contract.', id: 'card-1', title: 'First item' },
      { description: 'A second item in the same column.', id: 'card-2', title: 'Second item' },
    ],
    count: 2,
    id: 'todo',
    title: 'To do',
  },
  {
    cards: [{ description: 'An item currently being worked on.', id: 'card-3', title: 'In work' }],
    count: 1,
    id: 'in-progress',
    title: 'In progress',
  },
  { cards: [], count: 0, id: 'done', title: 'Done' },
]

const kanbanArgs = {
  columns,
  getCardLabel: (card: MechanicsCard) => card.title,
  getKey: (card: MechanicsCard) => card.id,
  renderCard: (card: MechanicsCard) => (
    <KanbanCard variant='interactive'>
      <KanbanCardHeader>
        <KanbanCardTitle>{card.title}</KanbanCardTitle>
        <KanbanCardDescription>{card.description}</KanbanCardDescription>
      </KanbanCardHeader>
      <KanbanCardFooter>Shared footer slot</KanbanCardFooter>
    </KanbanCard>
  ),
}

const MechanicsKanbanView = KanbanView as (props: KanbanViewProps<MechanicsCard>) => ReactElement

function Example({ loading = false }: Readonly<{ loading?: boolean }>) {
  return (
    <div className='h-144 min-w-0 p-4'>
      <KanbanView
        {...kanbanArgs}
        emptyColumnLabel='No items in this column.'
        loading={loading}
        loadingCardLabel='Loading collection item'
        onMoveCard={loading ? undefined : () => true}
      />
    </div>
  )
}

const meta = {
  args: kanbanArgs,
  argTypes: { loading: booleanArgType },
  component: MechanicsKanbanView,
  parameters: {
    docs: {
      description: {
        component:
          'Building Block de Kanban. Documenta projeção de colunas, movimentação, loading e renderização de cards sem fixtures ou regras de nenhuma feature.',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Collections/Views/Kanban',
} satisfies Meta<typeof MechanicsKanbanView>

export default meta

type Story = StoryObj<typeof meta>

export const Mechanics: Story = { args: kanbanArgs, render: () => <Example /> }
export const Loading: Story = { args: kanbanArgs, render: () => <Example loading /> }
