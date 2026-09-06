import type { Meta, StoryObj } from '@storybook/react-vite'
import { Dialog } from '@twincam/patterns/dialog'
import { Button } from '@twincam/ui/components/button'
import { MaximizeIcon } from 'lucide-react'
import { expect, waitFor, within } from 'storybook/test'
import {
  DialogTriggerHarness,
  assertDialogFocusContract,
} from '../../../test-utils/dialog-focus-contract'
import { booleanArgType } from '../../../test-utils/story-arg-types'

const sizeArgType = { control: 'inline-radio', options: ['sm', 'md', 'lg'] } as const

const meta = {
  args: {
    children: (
      <div className='space-y-2 text-sm'>
        <p>O painel rola quando o conteúdo passa da altura do popup.</p>
        <p className='text-muted-foreground'>
          O shell não conhece rota, mutação nem vocabulário de domínio: a vitrine compõe por cima.
        </p>
      </div>
    ),
    footer: (
      <>
        <Button type='button' variant='ghost'>
          Cancelar
        </Button>
        <Button type='button'>Salvar</Button>
      </>
    ),
    open: true,
    size: 'md',
    title: 'Editar tarefa',
    onOpenChange: () => undefined,
  },
  argTypes: {
    open: booleanArgType,
    size: sizeArgType,
  },
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component:
          'Shell de popup da família: header com título, descrição opcional e fechar, painel rolável, superfície de erro e rodapé fixo. Atende criação, edição e confirmação — `Create`, `Confirm` e `Destructive` são composições dele. Quando carrega dado, compõe `StateGuard` com o vocabulário de `state-kinds`, sem redeclarar estado; no papel `alertdialog` a dispensa é restrita.',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Dialogs',
} satisfies Meta<typeof Dialog>

export default meta

type Story = StoryObj<typeof meta>

async function waitForPopup() {
  return waitFor(() => {
    const opened = [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-popup"]')]
      .filter((candidate) => candidate.clientHeight > 0)
      .at(-1)

    if (!opened) throw new Error('o dialogo nao abriu')

    return opened
  })
}

export const Default: Story = {
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByRole('heading', { name: 'Editar tarefa' })).toBeTruthy()
  },
}

export const WithActions: Story = {
  args: {
    actions: (
      <Button aria-label='Abrir em tela cheia' size='icon' type='button' variant='ghost'>
        <MaximizeIcon aria-hidden='true' />
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A fileira do topo, à esquerda do fechar: ação sobre a superfície, e não sobre o registro — o que muda o registro fica no rodapé ou no corpo.',
      },
    },
  },
  play: async () => {
    const popup = await waitForPopup()
    const actions = popup.querySelector('[data-slot="dialog-actions"]')

    await expect(actions).not.toBeNull()
    await expect(
      within(popup)
        .getByRole('button', { name: 'Abrir em tela cheia' })
        .closest('[data-slot="dialog-actions"]'),
    ).toBe(actions)
  },
}

export const WithDescription: Story = {
  args: { description: 'Projeto Aurora' },
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByText('Projeto Aurora')).toBeTruthy()
  },
}

export const TallBody: Story = {
  args: {
    children: (
      <div className='space-y-4 text-sm'>
        {Array.from({ length: 24 }, (_, index) => (
          <p key={`linha-${index}`}>Linha {index + 1} de um corpo que passa da altura do popup.</p>
        ))}
        <p data-testid='ultima-linha'>Última linha do corpo.</p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Corpo mais alto que o popup: o painel ocupa a sobra entre header e rodapé e rola por dentro. A falha que motivou esta story — fim do corpo por baixo do rodapé fixo, fora do alcance da rolagem — depende da altura da janela e não se reproduz no runner, então a `play` documenta o contrato sem servir de guarda contra a regressão.',
      },
    },
  },
  play: async () => {
    const popup = await waitForPopup()
    const viewport = popup.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
    const footer = popup.querySelector<HTMLElement>('[data-slot="dialog-footer"]')

    if (!viewport || !footer) throw new Error('o painel ou o rodape nao renderizaram')

    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    // O painel cabe entre header e rodapé: sem isso ele transborda o popup e o
    // fim do corpo fica atrás do rodapé, fora do alcance da rolagem.
    await expect(viewport.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      Math.ceil(footer.getBoundingClientRect().top),
    )

    viewport.scrollTop = viewport.scrollHeight
    await waitFor(async () => {
      const last = within(popup).getByTestId('ultima-linha')
      await expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        Math.ceil(footer.getBoundingClientRect().top),
      )
    })
  },
}

export const Loading: Story = {
  args: {
    state: 'loading',
    stateSurface: { description: 'Buscando os dados da tarefa.', title: 'Carregando' },
  },
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByText('Carregando')).toBeTruthy()
  },
}

export const ErrorState: Story = {
  args: {
    state: 'error',
    stateSurface: {
      description: 'Não foi possível carregar a tarefa.',
      title: 'Falha ao carregar',
    },
  },
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByRole('alert').textContent).toContain('Falha ao carregar')
  },
}

/**
 * O contrato de a11y do overlay, exercido com gatilho de verdade: foco de
 * abertura, armadilha, `Esc` e retorno ao gatilho.
 */
export const WithTrigger: Story = {
  play: async ({ canvasElement }) =>
    assertDialogFocusContract({ canvasElement, popupSelector: '[data-slot="dialog-popup"]' }),
  render: () => (
    <DialogTriggerHarness>
      {({ open, onOpenChange }) => (
        <Dialog
          footer={
            <>
              <Button type='button' variant='ghost'>
                Cancelar
              </Button>
              <Button type='button'>Salvar</Button>
            </>
          }
          onOpenChange={onOpenChange}
          open={open}
          title='Editar tarefa'
        >
          <p className='text-sm'>O painel rola quando o conteudo passa da altura do popup.</p>
        </Dialog>
      )}
    </DialogTriggerHarness>
  ),
}
