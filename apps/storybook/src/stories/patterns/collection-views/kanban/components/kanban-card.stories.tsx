import {
  KanbanCard,
  KanbanCardAction,
  KanbanCardContent,
  KanbanCardDescription,
  KanbanCardFooter,
  KanbanCardHeader,
  KanbanCardOpenTrigger,
  KanbanCardSkeleton,
  KanbanCardTitle,
} from '@fifilo/patterns/collection-views'
import { Avatar, AvatarFallback } from '@fifilo/ui/components/avatar'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListTodoIcon } from 'lucide-react'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'

function Example({
  dimmed = false,
  display = 'full',
  interactive = false,
  selected = false,
}: Readonly<{
  dimmed?: boolean
  display?: 'compact' | 'full'
  interactive?: boolean
  selected?: boolean
}>) {
  return (
    <div className='w-full max-w-sm p-4'>
      <KanbanCard
        dimmed={dimmed}
        display={display}
        render={
          interactive
            ? (props) => (
                <a {...props} href='#task-detail'>
                  {props.children}
                </a>
              )
            : undefined
        }
        selected={selected}
        variant={interactive ? 'interactive' : 'default'}
      >
        <KanbanCardHeader>
          <KanbanCardTitle>Revisar proposta comercial</KanbanCardTitle>
          <KanbanCardDescription>
            O primitive organiza o shell; o consumer define significado e ações.
          </KanbanCardDescription>
        </KanbanCardHeader>

        <KanbanCardContent>
          <div className='flex flex-wrap gap-2'>
            <Badge variant='secondary'>Em andamento</Badge>
            <Badge variant='secondary'>Ana Souza</Badge>
          </div>
        </KanbanCardContent>

        <KanbanCardFooter>
          <div className='flex min-w-0 flex-1 items-center justify-between gap-3'>
            <span className='inline-flex shrink-0 items-center gap-1.5'>
              <ListTodoIcon aria-hidden className='size-3.5' />
              <span>4 tarefas</span>
            </span>
            <Avatar aria-label='Responsável: Ana Souza' className='size-6' title='Ana Souza'>
              <AvatarFallback className='text-xs text-foreground font-semibold'>AS</AvatarFallback>
            </Avatar>
          </div>
        </KanbanCardFooter>
      </KanbanCard>
    </div>
  )
}

/** Alvos do contrato visual do KanbanCard, medidos em browser real. */
const slot = (canvasElement: HTMLElement, nome: string) =>
  canvasElement.querySelector<HTMLElement>(`[data-slot="${nome}"]`) as HTMLElement

function OpenTriggerExample() {
  const [events, setEvents] = useState<readonly string[]>([])

  return (
    <div className='w-full max-w-sm p-4'>
      <KanbanCard variant='interactive'>
        <KanbanCardOpenTrigger
          aria-label='Abrir detalhes do item'
          onClick={() => setEvents((current) => [...current, 'abrir'])}
        />
        <KanbanCardHeader>
          <KanbanCardTitle>Revisar proposta comercial</KanbanCardTitle>
          <KanbanCardAction>
            <Button
              onClick={() => setEvents((current) => [...current, 'prioridade'])}
              size='sm'
              variant='ghost'
            >
              Prioridade
            </Button>
          </KanbanCardAction>
        </KanbanCardHeader>

        <KanbanCardContent>
          <div className='flex flex-wrap gap-2'>
            <Badge variant='secondary'>Em andamento</Badge>
            <span data-kanban-card-action>
              <Button
                onClick={() => setEvents((current) => [...current, 'responsável'])}
                size='sm'
                variant='ghost'
              >
                Ana Souza
              </Button>
            </span>
          </div>
        </KanbanCardContent>

        <KanbanCardFooter>
          <span data-story-events>{events.join(' · ') || 'nenhuma ação'}</span>
        </KanbanCardFooter>
      </KanbanCard>
    </div>
  )
}

const meta = {
  argTypes: {
    density: {
      control: 'select',
      description: 'Densidade do shell do card compartilhado.',
      options: ['sm', 'md', 'lg'],
    },
    dimmed: {
      control: 'boolean',
      description: 'Indica que o card está temporariamente inativo durante uma movimentação.',
    },
    display: {
      control: 'radio',
      description:
        'Define a densidade de conteúdo. Compacto mantém o cabeçalho e oculta descrição, conteúdo e footer.',
      options: ['full', 'compact'],
    },
    render: {
      control: false,
      description: 'Permite trocar o elemento raiz usando o contrato render de Base UI.',
    },
    selected: {
      control: 'boolean',
      description: 'Aplica o estado visual de seleção ao card.',
    },
    variant: {
      control: 'radio',
      description: 'Escolhe o tratamento visual padrão ou interativo do card.',
      options: ['default', 'interactive'],
    },
  },
  component: KanbanCard,
  parameters: {
    docs: {
      description: {
        component:
          'Contrato visual canônico para cards em Kanban. Use KanbanCard como shell e componha os slots KanbanCardHeader, KanbanCardTitle, KanbanCardDescription, KanbanCardAction, KanbanCardContent e KanbanCardFooter. A visualização full exibe a composição completa com resumo de tasks e responsável no footer; compact preserva o cabeçalho e o título. O consumer fornece o significado e as ações de domínio, sem sobrescrever o layout do componente.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Collections/Views/KanbanCard',
} satisfies Meta<typeof KanbanCard>

export default meta

type Story = StoryObj<typeof meta>

export const Full: Story = {
  play: async ({ canvasElement }) => {
    const footer = getComputedStyle(slot(canvasElement, 'card-footer'))

    // The footer separates from the content by a 1px rule, not by spacing.
    await expect(footer.borderTopWidth).toBe('1px')
    await expect(footer.minHeight).toBe('36px')
    await expect(footer.paddingLeft).toBe('12px')
    await expect(footer.paddingTop).toBe('8px')

    // Supporting text: the same dimmed color in footer and description, legible in both themes.
    const description = getComputedStyle(slot(canvasElement, 'card-description'))

    await expect(description.color).toBe(footer.color)
    await expect(description.color).not.toBe(
      getComputedStyle(slot(canvasElement, 'card-title')).color,
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          'Anatomia completa para o card com título, descrição, metadados e footer de tasks e responsável.',
      },
    },
  },
  render: () => <Example />,
}

export const Compact: Story = {
  play: async ({ canvasElement }) => {
    const header = getComputedStyle(slot(canvasElement, 'card-header'))
    const title = getComputedStyle(slot(canvasElement, 'card-title'))

    await expect(header.minHeight).toBe('40px')
    await expect(header.paddingLeft).toBe('12px')
    await expect(header.paddingTop).toBe('8px')

    await expect(title.fontSize).toBe('14px')
    await expect(title.textOverflow).toBe('ellipsis')
    await expect(title.whiteSpace).toBe('nowrap')

    // The secondary sections disappear from the compact mode.
    await expect(slot(canvasElement, 'card-description').hidden).toBe(true)
    await expect(slot(canvasElement, 'card-footer').hidden).toBe(true)
  },
  parameters: {
    docs: {
      description: {
        story:
          'Modo compacto para preservar apenas o cabeçalho e o título quando o espaço vertical é limitado.',
      },
    },
  },
  render: () => <Example display='compact' />,
}

export const WithOpenTriggerAndActions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'O card permanece `article` e ganha um gatilho esticado para abrir. Controles internos marcados com `data-kanban-card-action` sobem acima do gatilho e recebem o próprio clique — é o que permite propriedade editável dentro de um card clicável, sem botão dentro de botão.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = slot(canvasElement, 'card')

    await expect(card.tagName).toBe('ARTICLE')

    // The trigger covers the card's inner area — `inset-0` measures the padding
    // box, so the comparison is against `clientWidth`, not the outer border.
    const trigger = slot(canvasElement, 'kanban-card-open-trigger')
    const triggerBox = trigger.getBoundingClientRect()

    await expect(getComputedStyle(trigger).position).toBe('absolute')
    await expect(Math.round(triggerBox.width)).toBe(card.clientWidth)
    await expect(Math.round(triggerBox.height)).toBe(card.clientHeight)

    // The inner action sits above the trigger, or it would never take the click.
    const action = canvasElement.querySelector<HTMLElement>('[data-kanban-card-action]')

    if (!action) throw new Error('A story não renderizou [data-kanban-card-action].')

    await expect(getComputedStyle(action).zIndex).toBe('10')

    // Each target fires only what belongs to it.
    await userEvent.click(canvas.getByRole('button', { name: 'Prioridade' }))
    await expect(canvasElement.querySelector('[data-story-events]')?.textContent).toBe('prioridade')

    await userEvent.click(canvas.getByRole('button', { name: 'Abrir detalhes do item' }))
    await expect(canvasElement.querySelector('[data-story-events]')?.textContent).toBe(
      'prioridade · abrir',
    )
  },
  render: () => <OpenTriggerExample />,
}

export const Selected: Story = {
  play: async ({ canvasElement }) => {
    const card = slot(canvasElement, 'card')

    await expect(card.getAttribute('data-state')).toBe('selected')
    // ring-2: um anel de 2px de espalhamento no box-shadow.
    await expect(getComputedStyle(card).boxShadow).toContain('0px 0px 0px 2px')
  },
  parameters: {
    docs: {
      description: {
        story: 'Estado visual usado quando o card está selecionado na coleção.',
      },
    },
  },
  render: () => <Example selected />,
}

export const Moving: Story = {
  play: async ({ canvasElement }) => {
    const card = getComputedStyle(slot(canvasElement, 'card'))

    // Movement is communicated by a dashed border — never by opacity, which would
    // fade the text along with it.
    await expect(card.borderStyle).toBe('dashed')
    await expect(card.opacity).toBe('1')
  },
  parameters: {
    docs: {
      description: {
        story: 'Estado temporário durante uma movimentação por drag and drop.',
      },
    },
  },
  render: () => <Example dimmed />,
}

export const Interactive: Story = {
  play: async ({ canvasElement }) => {
    // The interactive root keeps the text left-aligned even when it becomes a
    // button or a link. The `hover:` highlight stays out: CSS `:hover` does not
    // answer a synthetic event, only a real mouse — the class remains the
    // evidence available, in jsdom.
    await expect(getComputedStyle(slot(canvasElement, 'card')).textAlign).toBe('left')
  },

  parameters: {
    docs: {
      description: {
        story:
          'Composição interativa que troca o elemento raiz por um link sem duplicar o shell do card.',
      },
    },
  },
  render: () => <Example interactive />,
}

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Estado de carregamento que preserva a anatomia completa do KanbanCard e comunica progresso sem conteúdo fictício.',
      },
    },
  },
  render: () => (
    <div className='w-full max-w-sm p-4'>
      <KanbanCardSkeleton label='Carregando card' />
    </div>
  ),
}
