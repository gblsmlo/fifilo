import { Button } from '@twincam/ui/components/button'
import { type ReactNode, useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'

const TRIGGER_LABEL = 'Abrir'

interface DialogTriggerHarnessProps {
  children: (state: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode
}

/**
 * O gatilho que as stories controladas não têm. Sem um elemento que abre o
 * popup, `Esc` não tem estado para derrubar e o foco não tem para onde voltar —
 * metade do contrato de a11y do overlay fica fora de qualquer teste.
 */
export function DialogTriggerHarness({ children }: Readonly<DialogTriggerHarnessProps>) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} type='button'>
        {TRIGGER_LABEL}
      </Button>
      {children({ onOpenChange: setOpen, open })}
    </>
  )
}

interface FocusContractOptions {
  canvasElement: HTMLElement
  popupSelector: string
  /** Passos de `Tab` até o ciclo fechar; um a mais que os focáveis do popup. */
  tabSteps?: number
}

/**
 * Afirma os quatro comportamentos do overlay que o portão do axe não cobre:
 * foco de abertura dentro do popup, armadilha de foco, `Esc` que fecha e foco
 * de volta no gatilho (BUG-008/015/037).
 */
export async function assertDialogFocusContract({
  canvasElement,
  popupSelector,
  tabSteps = 6,
}: FocusContractOptions): Promise<void> {
  const trigger = within(canvasElement).getByRole('button', { name: TRIGGER_LABEL })

  await userEvent.click(trigger)

  const popup = await waitFor(() => {
    const opened = document.querySelector<HTMLElement>(popupSelector)

    if (!opened) throw new Error('o dialogo nao abriu')

    return opened
  })

  await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true))

  for (let step = 0; step < tabSteps; step += 1) {
    await userEvent.tab()
  }

  // O ciclo passa pelos focus guards do Base UI, que ficam fora do popup; o que
  // o contrato exige é que ele volte para dentro, nunca para a página.
  await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true))

  await userEvent.keyboard('{Escape}')

  await waitFor(() => expect(document.querySelector(popupSelector)).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(trigger))
}
