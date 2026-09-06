import { ConfirmDialog } from '@fifilo/patterns/confirm-dialog'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import {
  DialogTriggerHarness,
  assertDialogFocusContract,
} from '../../../test-utils/dialog-focus-contract'
import { booleanArgType } from '../../../test-utils/story-arg-types'

const meta = {
  args: {
    confirmLabel: 'Publicar',
    confirmingLabel: 'Publicando…',
    description: 'A campanha passa a valer para a equipe e começa a receber leads.',
    open: true,
    title: 'Publicar a campanha?',
    onConfirm: () => undefined,
    onOpenChange: () => undefined,
  },
  argTypes: {
    isConfirming: booleanArgType,
    open: booleanArgType,
  },
  component: ConfirmDialog,
  parameters: {
    docs: {
      description: {
        component:
          'Confirmação de uma ação que segue adiante e pode ser desfeita. Compõe o shell `Dialogs` com papel `dialog` e dispensa normal. A ação de confirmar nunca é destrutiva: o que destrói é `DestructiveDialog`, com papel `alertdialog` e dispensa restrita.',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Dialogs/Confirm',
} satisfies Meta<typeof ConfirmDialog>

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
    const popup = await waitForPopup()
    const screen = within(popup)

    await expect(popup.getAttribute('role')).toBe('dialog')
    await expect(screen.getByRole('button', { name: 'Publicar' }).className).not.toContain(
      'bg-destructive',
    )
  },
}

export const Confirming: Story = {
  args: { isConfirming: true },
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByRole('button', { name: 'Publicando…' })).toBeDisabled()
    await expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  },
}

export const WithError: Story = {
  args: { errorMessage: 'Não foi possível publicar a campanha.' },
  play: async () => {
    const screen = within(await waitForPopup())

    await expect(screen.getByRole('alert').textContent).toContain('Não foi possível publicar')
  },
}

/**
 * O contrato de a11y do overlay, exercido com gatilho de verdade. A dispensa e
 * normal: `Esc` fecha e o foco volta ao gatilho.
 */
export const WithTrigger: Story = {
  play: async ({ canvasElement }) =>
    assertDialogFocusContract({ canvasElement, popupSelector: '[data-slot="dialog-popup"]' }),
  render: () => (
    <DialogTriggerHarness>
      {({ open, onOpenChange }) => (
        <ConfirmDialog
          confirmLabel='Publicar'
          description='A campanha passa a valer para a equipe.'
          onConfirm={() => undefined}
          onOpenChange={onOpenChange}
          open={open}
          title='Publicar a campanha?'
        />
      )}
    </DialogTriggerHarness>
  ),
}
