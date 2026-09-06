import { DestructiveDialog } from '@fifilo/patterns/destructive-dialog'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import {
  DialogTriggerHarness,
  assertDialogFocusContract,
} from '../../../test-utils/dialog-focus-contract'
import { booleanArgType } from '../../../test-utils/story-arg-types'

const meta = {
  args: {
    confirmLabel: 'Arquivar tarefa',
    confirmingLabel: 'Arquivando…',
    description:
      '“Conferir assinatura do contrato” sai da coleção e do quadro. Arquivar não tem volta.',
    open: true,
    title: 'Arquivar esta tarefa?',
    onConfirm: () => undefined,
    onOpenChange: () => undefined,
  },
  argTypes: {
    isConfirming: booleanArgType,
    open: booleanArgType,
  },
  component: DestructiveDialog,
  parameters: {
    docs: {
      description: {
        component:
          'A única anatomia destrutiva do catálogo: o shell `Dialogs` no papel `alertdialog`, com dispensa restrita — clique fora não fecha e não há botão de fechar. A confirmação que **não** destrói é `ConfirmDialog`, no papel `dialog`: escolher entre os dois é escolher a consequência, não a cor do botão.',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Dialogs/Destructive',
} satisfies Meta<typeof DestructiveDialog>

export default meta

type Story = StoryObj<typeof meta>

async function waitForPopup() {
  return waitFor(() => {
    const opened = [...document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-popup"]')]
      .filter((candidate) => candidate.clientHeight > 0)
      .at(-1)

    if (!opened) throw new Error('o dialogo nao abriu')

    return opened
  })
}

export const Default: Story = {
  play: async () => {
    const popup = await waitForPopup()
    const screen = within(popup)

    await expect(popup.getAttribute('role')).toBe('alertdialog')

    const cancel = screen.getByRole('button', { name: 'Cancelar' })

    // Cancelar vem primeiro no rodapé e recebe o foco de abertura: um `Enter`
    // reflexo recusa a destruição em vez de executá-la.
    await waitFor(() => expect(document.activeElement).toBe(cancel))
  },
}

export const Confirming: Story = {
  args: { isConfirming: true },
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByRole('button', { name: 'Arquivando…' })).toBeDisabled()
    await expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  },
}

export const WithError: Story = {
  args: { errorMessage: 'Não foi possível arquivar a tarefa.' },
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByRole('alert').textContent).toContain('Não foi possível arquivar')
  },
}

/**
 * O contrato de a11y do overlay, exercido com gatilho de verdade. A dispensa e
 * restrita — clique fora nao fecha —, mas `Esc` continua fechando e o foco
 * volta ao gatilho.
 */
export const WithTrigger: Story = {
  play: async ({ canvasElement }) =>
    assertDialogFocusContract({
      canvasElement,
      popupSelector: '[data-slot="alert-dialog-popup"]',
    }),
  render: () => (
    <DialogTriggerHarness>
      {({ open, onOpenChange }) => (
        <DestructiveDialog
          confirmLabel='Arquivar tarefa'
          description='Arquivar nao tem volta.'
          onConfirm={() => undefined}
          onOpenChange={onOpenChange}
          open={open}
          title='Arquivar esta tarefa?'
        />
      )}
    </DialogTriggerHarness>
  ),
}
