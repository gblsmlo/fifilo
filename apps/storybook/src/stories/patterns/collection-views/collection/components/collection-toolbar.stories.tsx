import {
  Action,
  type CollectionDefinition,
  CollectionProvider,
  CollectionSearchField,
  CollectionToolbar,
  FilterRadioSubmenu,
  PresetsMenu,
  ViewSettingsMenu,
  ViewSettingsSection,
} from '@fifilo/patterns/collection-views'
import collectionToolbarDocs from '@fifilo/patterns/collection-views/README.md?raw'
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
} from '@fifilo/ui/components/menu'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ArrowDownUpIcon,
  CalendarDaysIcon,
  CircleDotIcon,
  LayoutGridIcon,
  Rows3Icon,
  ShapesIcon,
  SignalHighIcon,
  TagsIcon,
  UserRoundIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { expect, screen, userEvent, within } from 'storybook/test'

interface DemoItem {
  assigneeId: string | null
  id: string
  statusId: string | null
  title: string
}

type FilterKey = 'assignee' | 'date' | 'priority' | 'status' | 'tags'
type Filters = Record<FilterKey, string[]>

const demoCollection: CollectionDefinition<DemoItem> = {
  getKey: (item) => item.id,
  getLabel: (item) => item.title,
  groupings: [
    {
      getGroupId: (item) => item.statusId,
      id: 'status',
      label: 'Status',
      options: [
        { id: 'todo', label: 'A fazer' },
        { id: 'in-progress', label: 'Em andamento' },
        { id: 'review', label: 'Em revisão' },
        { id: 'done', label: 'Concluído' },
      ],
    },
    {
      getGroupId: (item) => item.assigneeId,
      id: 'assignee',
      label: 'Responsável',
      options: [
        { id: 'ana', label: 'Ana Souza' },
        { id: 'bruno', label: 'Bruno Lima' },
      ],
    },
  ],
  items: [],
}

const filterDefinitions = [
  {
    icon: CircleDotIcon,
    id: 'status',
    label: 'Status',
    options: ['A fazer', 'Em andamento', 'Em revisão', 'Concluído'],
  },
  {
    icon: UserRoundIcon,
    id: 'assignee',
    label: 'Responsável',
    options: ['Sem responsável', 'Ana Souza', 'Bruno Lima'],
  },
  {
    icon: SignalHighIcon,
    id: 'priority',
    label: 'Prioridade',
    options: ['Sem prioridade', 'Urgente', 'Alta', 'Média', 'Baixa'],
  },
  {
    icon: TagsIcon,
    id: 'tags',
    label: 'Tags',
    options: ['Documento', 'Retorno', 'Prazo'],
  },
  {
    icon: CalendarDaysIcon,
    id: 'date',
    label: 'Prazo',
    options: ['Hoje', 'Esta semana', 'Atrasado', 'Sem prazo'],
  },
] as const

function createEmptyFilters(): Filters {
  return { assignee: [], date: [], priority: [], status: [], tags: [] }
}

function Frame({ children }: Readonly<{ children: ReactNode }>) {
  return <div className='w-full max-w-6xl p-6'>{children}</div>
}

function PresetsControl() {
  return (
    <PresetsMenu count={24} countLabel='24 tarefas' label='Minhas tarefas'>
      <MenuGroup>
        <MenuGroupLabel>Visualizações</MenuGroupLabel>
        <MenuItem>Minhas tarefas</MenuItem>
        <MenuItem>Todas as tarefas</MenuItem>
        <MenuItem>Atrasadas</MenuItem>
      </MenuGroup>
    </PresetsMenu>
  )
}

/**
 * Superfície única: o que antes eram dois gatilhos vizinhos (Filtrar e
 * Configurações) vira um menu com seções. O pacote traz a moldura, a contagem e o
 * limpar; as seções e suas opções continuam do consumer.
 */
function MergedViewSettingsControl() {
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [filters, setFilters] = useState<Filters>(createEmptyFilters)
  const [layout, setLayout] = useState<'kanban' | 'list'>('kanban')
  const [sort, setSort] = useState<'due' | 'updated'>('due')
  const activeCount = Object.values(filters).reduce((count, values) => count + values.length, 0)

  const toggleFilter = (key: FilterKey, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((currentValue) => currentValue !== value)
        : [...current[key], value],
    }))
  }

  const modified = activeCount > 0 || layout !== 'kanban' || sort !== 'due'

  return (
    <ViewSettingsMenu
      activeFilterCount={activeCount}
      onClearFilters={() => setFilters(createEmptyFilters())}
      onSavePreference={() => undefined}
      savePreferenceDisabled={!modified}
    >
      <ViewSettingsSection label='Exibição'>
        <MenuSub>
          <MenuSubTrigger>
            <LayoutGridIcon aria-hidden='true' />
            Layout
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuRadioGroup
              onValueChange={(value) => setLayout(value as typeof layout)}
              value={layout}
            >
              <MenuRadioItem value='kanban'>Kanban</MenuRadioItem>
              <MenuRadioItem value='list'>Lista</MenuRadioItem>
            </MenuRadioGroup>
          </MenuSubPopup>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger>
            <Rows3Icon aria-hidden='true' />
            Densidade
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuRadioGroup
              onValueChange={(value) => setDensity(value as typeof density)}
              value={density}
            >
              <MenuRadioItem value='comfortable'>Confortável</MenuRadioItem>
              <MenuRadioItem value='compact'>Compacta</MenuRadioItem>
            </MenuRadioGroup>
          </MenuSubPopup>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger>
            <CalendarDaysIcon aria-hidden='true' />
            Ordenar por
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuRadioGroup onValueChange={(value) => setSort(value as typeof sort)} value={sort}>
              <MenuRadioItem value='due'>Prazo</MenuRadioItem>
              <MenuRadioItem value='updated'>Atualização</MenuRadioItem>
            </MenuRadioGroup>
          </MenuSubPopup>
        </MenuSub>
      </ViewSettingsSection>
      <MenuSeparator />
      <ViewSettingsSection label='Filtros'>
        {filterDefinitions.map(({ icon: Icon, id, label, options }) => (
          <MenuSub key={id}>
            <MenuSubTrigger>
              <Icon aria-hidden='true' />
              {label}
            </MenuSubTrigger>
            <MenuSubPopup>
              <MenuGroup>
                <MenuGroupLabel>{label}</MenuGroupLabel>
                {options.map((option) => (
                  <MenuCheckboxItem
                    checked={filters[id].includes(option)}
                    closeOnClick={false}
                    key={option}
                    onCheckedChange={() => toggleFilter(id, option)}
                  >
                    {option}
                  </MenuCheckboxItem>
                ))}
              </MenuGroup>
            </MenuSubPopup>
          </MenuSub>
        ))}
      </ViewSettingsSection>
    </ViewSettingsMenu>
  )
}

function ToolbarProposal() {
  return (
    <CollectionProvider collection={demoCollection}>
      <CollectionToolbar
        aria-label='Controles da coleção'
        endSlot={
          <>
            <MergedViewSettingsControl />
            <Action label='Nova tarefa' onClick={() => undefined} />
          </>
        }
        startSlot={<PresetsControl />}
        variant='plain'
      />
    </CollectionProvider>
  )
}

/**
 * Coleção que não alterna layout: a busca fica visível à esquerda e o menu
 * carrega só ordenação e um filtro de valor único.
 */
function SingleValueToolbar() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name_asc')
  const [type, setType] = useState('')
  const activeCount = [search, type].filter(Boolean).length

  return (
    <CollectionToolbar
      aria-label='Controles da coleção'
      endSlot={
        <>
          <ViewSettingsMenu
            activeFilterCount={activeCount}
            onClearFilters={() => {
              setSearch('')
              setType('')
            }}
          >
            <ViewSettingsSection label='Exibição'>
              <FilterRadioSubmenu
                clearLabel='Nome (A–Z)'
                icon={ArrowDownUpIcon}
                label='Ordenar por'
                onValueChange={(value) => setSort(value || 'name_asc')}
                options={[
                  ['name_desc', 'Nome (Z–A)'],
                  ['created_desc', 'Mais recentes'],
                ]}
                value={sort === 'name_asc' ? '' : sort}
              />
            </ViewSettingsSection>
            <MenuSeparator />
            <ViewSettingsSection label='Filtros'>
              <FilterRadioSubmenu
                icon={ShapesIcon}
                label='Tipo'
                onValueChange={setType}
                options={[
                  ['person', 'Pessoa'],
                  ['organization', 'Organização'],
                ]}
                value={type}
              />
            </ViewSettingsSection>
          </ViewSettingsMenu>
          <Action label='Novo contato' onClick={() => undefined} />
        </>
      }
      startSlot={
        <CollectionSearchField
          label='Buscar contatos'
          onCommit={setSearch}
          placeholder='Nome, e-mail ou telefone'
          value={search}
        />
      }
      variant='plain'
    />
  )
}

const meta = {
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'plain'] },
  },
  component: CollectionToolbar,
  parameters: {
    docs: {
      description: {
        component: collectionToolbarDocs,
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Collections/View Toolbar',
} satisfies Meta<typeof CollectionToolbar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Contrato canônico, o mesmo que a página de Tarefas compõe: views salvas no slot esquerdo; à direita um só gatilho de Exibição, com filtro e configuração como seções, seguido da ação de inclusão. A permissão é do consumer — sem ela a ação simplesmente não é composta.',
      },
    },
  },
  render: () => (
    <Frame>
      <ToolbarProposal />
    </Frame>
  ),
}

export const SavedViews: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'O preset ativo ocupa o slot esquerdo, com label, badge de quantidade e menu de views salvas alinhado ao início.',
      },
    },
  },
  render: () => (
    <Frame>
      <CollectionToolbar
        aria-label='Views salvas da coleção'
        startSlot={<PresetsControl />}
        variant='plain'
      />
    </Frame>
  ),
}

export const ViewSettings: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Filtro avançado e configuração num gatilho só, dividido em seções. A contagem no rótulo conta apenas filtros ativos — layout e ordenação são estado da view, não filtro. O rodapé guarda a preferência antes de oferecer o descarte, e cada item só habilita quando tem o que fazer.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // One trigger, not two: filtering and settings do not coexist on this surface.
    await expect(canvas.queryByRole('button', { name: 'Filtrar' })).toBe(null)
    await expect(canvas.queryByRole('button', { name: 'Configurações' })).toBe(null)

    await userEvent.click(canvas.getByRole('button', { name: 'Exibição' }))

    const menu = within(await screen.findByRole('menu'))
    for (const section of ['Exibição', 'Filtros']) {
      await expect(menu.getByText(section)).toBeTruthy()
    }

    // With no active filter, clearing has nothing to do. The menu item is a `div`
    // with `role=menuitem`, so the disabled state lives in `data-disabled`.
    await expect(menu.getByRole('menuitem', { name: /Limpar filtros/ })).toHaveAttribute(
      'data-disabled',
    )
    // A draft equal to the starting point has no preference to save.
    await expect(menu.getByRole('menuitem', { name: /Salvar preferência/ })).toHaveAttribute(
      'data-disabled',
    )
  },
  render: () => (
    <Frame>
      <CollectionToolbar
        aria-label='Ajustes da coleção'
        endSlot={<MergedViewSettingsControl />}
        variant='plain'
      />
    </Frame>
  ),
}

export const WithSearch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Busca visível no slot esquerdo, para a coleção em que procurar é a interação principal — o menu esconderia o controle mais usado da tela. Os filtros de valor único usam o submenu compartilhado, que trata "todos" como ausência de filtro e devolve string vazia.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const field = canvas.getByRole('searchbox', { name: 'Buscar contatos' })
    await userEvent.type(field, 'ana')
    // Typing does not confirm: the consumer writes to the URL, and writing per
    // keystroke would stack one history entry per letter.
    await expect(canvas.getByRole('button', { name: 'Exibição' })).toBeTruthy()

    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByRole('button', { name: 'Exibição (1)' })).toBeTruthy()
  },
  render: () => (
    <Frame>
      <SingleValueToolbar />
    </Frame>
  ),
}
