'use client'

import { Button } from '@fifilo/ui/components/button'
import { DialogClose } from '@fifilo/ui/components/dialog'
import { LoaderCircleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Dialog } from './dialog'

export interface ConfirmDialogProps {
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
 * Confirmação de uma ação que segue adiante e pode ser desfeita: papel
 * `dialog`, dispensa normal. O que destrói é `DestructiveDialog`, com papel e
 * dispensa próprios.
 */
export function ConfirmDialog({
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
}: Readonly<ConfirmDialogProps>) {
  return (
    <Dialog
      description={description}
      errorMessage={errorMessage}
      footer={
        <>
          <DialogClose
            disabled={isConfirming}
            render={
              <Button disabled={isConfirming} type='button' variant='ghost'>
                {cancelLabel}
              </Button>
            }
          />
          <Button disabled={isConfirming} onClick={onConfirm} type='button'>
            {isConfirming ? <LoaderCircleIcon aria-hidden='true' className='animate-spin' /> : null}
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    />
  )
}
