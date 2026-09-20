import {
  DateProperty,
  PersonProperty,
  PriorityProperty,
  type PriorityPropertyValue,
  PropertyCollection,
  StatusProperty,
  type StatusPropertyValue,
  TagsProperty,
} from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalendarDaysIcon,
  CircleDotIcon,
  SignalHighIcon,
  TagIcon,
  UserCircleIcon,
} from 'lucide-react'
import { useState } from 'react'
import { expect, screen, userEvent, within } from 'storybook/test'
import { booleanArgType } from '../../../../test-utils/story-arg-types'

const people = [
  { label: 'Bruno Lima', value: 'person-1' },
  { label: 'Ana Souza', value: 'person-2' },
] as const

const etiquetas = [
  { label: 'Documentos', value: 'documents' },
  { label: 'Retorno', value: 'return' },
] as const

const meta = {
  argTypes: {
    readOnly: booleanArgType,
  },
  component: PropertyCollection,
  parameters: {
    docs: {
      description: {
        component:
          'Fileira de propriedades de uma collection com preferência de visibilidade. O catálogo — quais propriedades existem, em que ordem e quais são default — pertence à collection; o trigger `…` abre o menu que lista o catálogo inteiro para o usuário adicionar ou remover da fileira. Uma propriedade visível e vazia mostra a própria affordance de preenchimento; oculta, é omitida. Ligar e desligar não reordena: a posição segue a ordem do catálogo.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Properties/Collection',
} satisfies Meta<typeof PropertyCollection>

export default meta

type Story = StoryObj<typeof PropertyCollection>

/**
 * O registro de uma Task: status e prioridade sempre têm valor (vazio é estado
 * do domínio), responsável e prazo nascem vazios com affordance própria, e
 * etiquetas ficam fora da fileira até o usuário preferir vê-las.
 */
function TaskCollectionExample({ readOnly = false }: Readonly<{ readOnly?: boolean }>) {
  const [status, setStatus] = useState<StatusPropertyValue>('inProgress')
  const [priority, setPriority] = useState<PriorityPropertyValue>('high')
  const [assignee, setAssignee] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [tags, setTags] = useState<readonly string[]>([])

  return (
    <PropertyCollection
      ariaLabel='Propriedades da Task'
      items={[
        {
          defaultVisible: true,
          icon: CircleDotIcon,
          id: 'status',
          label: 'Status',
          render: () => (
            <StatusProperty ariaLabel='Status' onValueChange={setStatus} value={status} />
          ),
        },
        {
          defaultVisible: true,
          icon: SignalHighIcon,
          id: 'priority',
          label: 'Prioridade',
          render: () => (
            <PriorityProperty ariaLabel='Prioridade' onValueChange={setPriority} value={priority} />
          ),
        },
        {
          defaultVisible: true,
          icon: UserCircleIcon,
          id: 'assignee',
          label: 'Responsável',
          render: () => (
            <PersonProperty
              ariaLabel='Responsável'
              onValueChange={setAssignee}
              options={people}
              placeholder='Definir responsável'
              value={assignee}
            />
          ),
        },
        {
          defaultVisible: true,
          icon: CalendarDaysIcon,
          id: 'dueDate',
          label: 'Prazo',
          render: () => (
            <DateProperty
              ariaLabel='Prazo'
              fallback='Definir prazo'
              locale='pt-BR'
              onValueChange={setDueDate}
              value={dueDate}
            />
          ),
        },
        {
          icon: TagIcon,
          id: 'tags',
          label: 'Etiquetas',
          render: () => (
            <TagsProperty
              ariaLabel='Etiquetas'
              onValueChange={setTags}
              options={etiquetas}
              value={tags}
            />
          ),
        },
      ]}
      readOnly={readOnly}
    />
  )
}

/**
 * O registro de um Lead compartilha as mesmas Properties com outro catálogo:
 * sem prioridade, status restrito ao funil e um default diferente. A diferença
 * entre collections mora no registro, nunca em variações das Properties.
 */
function LeadCollectionExample() {
  const [status, setStatus] = useState<StatusPropertyValue>('todo')
  const [owner, setOwner] = useState<string | null>('person-2')
  const [nextContact, setNextContact] = useState<string | null>('2026-08-28')
  const [tags, setTags] = useState<readonly string[]>(['return'])

  return (
    <PropertyCollection
      ariaLabel='Propriedades do Lead'
      items={[
        {
          defaultVisible: true,
          icon: CircleDotIcon,
          id: 'status',
          label: 'Status',
          render: () => (
            <StatusProperty
              ariaLabel='Status'
              onValueChange={setStatus}
              value={status}
              values={['todo', 'inProgress', 'done', 'canceled']}
            />
          ),
        },
        {
          defaultVisible: true,
          icon: UserCircleIcon,
          id: 'owner',
          label: 'Dono',
          render: () => (
            <PersonProperty
              ariaLabel='Dono'
              onValueChange={setOwner}
              options={people}
              placeholder='Definir dono'
              value={owner}
            />
          ),
        },
        {
          defaultVisible: true,
          icon: TagIcon,
          id: 'tags',
          label: 'Etiquetas',
          render: () => (
            <TagsProperty
              ariaLabel='Etiquetas'
              onValueChange={setTags}
              options={etiquetas}
              value={tags}
            />
          ),
        },
        {
          icon: CalendarDaysIcon,
          id: 'nextContact',
          label: 'Próximo contato',
          render: () => (
            <DateProperty
              ariaLabel='Próximo contato'
              fallback='Agendar contato'
              locale='pt-BR'
              onValueChange={setNextContact}
              value={nextContact}
            />
          ),
        },
      ]}
    />
  )
}

export const Task: Story = {
  play: async ({ canvas }) => {
    const group = await canvas.findByRole('group', { name: 'Propriedades da Task' })

    await expect(group.textContent).toContain('Em andamento')
    await expect(group.textContent).toContain('Definir responsável')
    await expect(canvas.queryByLabelText('Etiquetas')).toBe(null)
    await expect(canvas.getByRole('button', { name: 'Ajustar propriedades' })).toBeTruthy()
  },
  parameters: {
    docs: {
      description: {
        story:
          'Defaults visíveis com dois vazios (responsável e prazo) mostrando a affordance da própria Property; etiquetas só entram pelo trigger.',
      },
    },
  },
  render: (args) => <TaskCollectionExample readOnly={args.readOnly} />,
}

export const Lead: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Mesmo pattern, outro catálogo: o registro por collection decide quais propriedades existem, a ordem e os defaults.',
      },
    },
  },
  render: () => <LeadCollectionExample />,
}

export const ReadOnly: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Ajustar propriedades' })).toBe(null)
  },
  parameters: {
    docs: {
      description: {
        story: 'Sem o trigger de preferência a fileira mostra somente os visíveis.',
      },
    },
  },
  render: () => <TaskCollectionExample readOnly />,
}

/**
 * Nenhuma propriedade default: a fileira nasce só com o trigger, que é o
 * caminho de preenchimento — o zero da collection é uma ação, não um aviso.
 */
export const SemDefaults: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Ajustar propriedades' }))

    // The popup is portalled outside the canvas; the menu is queried on the document.
    const menu = within(await screen.findByRole('menu'))
    const options = menu.getAllByRole('menuitemcheckbox')
    await expect(options.map((option) => option.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
    ])
  },
  render: () => (
    <PropertyCollection
      ariaLabel='Propriedades'
      items={[
        {
          icon: CircleDotIcon,
          id: 'status',
          label: 'Status',
          render: () => <StatusProperty readOnly value='todo' />,
        },
        {
          icon: CalendarDaysIcon,
          id: 'dueDate',
          label: 'Prazo',
          render: () => (
            <DateProperty
              ariaLabel='Prazo'
              fallback='Definir prazo'
              locale='pt-BR'
              readOnly
              value={null}
            />
          ),
        },
      ]}
    />
  ),
}
