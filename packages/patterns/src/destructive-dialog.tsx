'use client'

import { AlertDialogClose } from '@twincam/ui/components/alert-dialog'
import { Button } from '@twincam/ui/components/button'
import { LoaderCircleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Dialog } from './dialog'

export interface DestructiveDialogProps {
  cancelLabel?: string
  confirmLabel: string
  confirmingLabel?: string
  description: ReactNode
  errorMessage?: ReactNode | null
  isConfirming?: boolean
  open: boolean
  title: ReactNode
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

/**
 * A única anatomia destrutiva do catálogo: papel `alertdialog` e dispensa
 * restrita — clique fora não fecha e não há botão de fechar. A confirmação que
 * não destrói é `ConfirmDialog`, e escolher entre os dois é escolher a
 * consequência da ação.
 */
export function DestructiveDialog({
  cancelLabel = 'Cancelar',
  confirmLabel,
  confirmingLabel = confirmLabel,
  description,
  errorMessage = null,
  isConfirming = false,
  open,
  title,
  onConfirm,
  onOpenChange,
}: Readonly<DestructiveDialogProps>) {
  return (
    <Dialog
      description={description}
      errorMessage={errorMessage}
      footer={
        <>
          <AlertDialogClose
            disabled={isConfirming}
            render={
              <Button disabled={isConfirming} type='button' variant='ghost'>
                {cancelLabel}
              </Button>
            }
          />
          <Button disabled={isConfirming} onClick={onConfirm} type='button' variant='destructive'>
            {isConfirming ? <LoaderCircleIcon aria-hidden='true' className='animate-spin' /> : null}
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      role='alertdialog'
      title={title}
    />
  )
}
