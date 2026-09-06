'use client'

import {
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialog as AlertDialogRoot,
  AlertDialogTitle,
} from '@twincam/ui/components/alert-dialog'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  Dialog as DialogRoot,
  DialogTitle,
} from '@twincam/ui/components/dialog'
import { cn } from '@twincam/ui/lib/utils'
import type { ReactNode } from 'react'
import { StateGuard, type StateSurfaceProps, type SurfaceGuardState } from '../state-surface'

export type DialogSize = 'sm' | 'md' | 'lg'

/**
 * `alertdialog` traz a dispensa restrita do Base UI: clique fora não fecha e o
 * popup não tem botão de fechar. É o papel de quem confirma uma ação sem volta.
 */
export type DialogRole = 'dialog' | 'alertdialog'

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

interface DialogBaseProps {
  /** Ações do topo, à esquerda do fechar. Ícones, no vocabulário da vitrine. */
  actions?: ReactNode
  children?: ReactNode
  /** Segunda linha do header, abaixo do título. Sem ela o header mostra só o título. */
  description?: ReactNode
  /** Falha da ação do rodapé, anunciada como `alert` acima dele. */
  errorMessage?: ReactNode | null
  /** Rodapé fixo, fora da área rolável. Sem ele o popup não desenha rodapé. */
  footer?: ReactNode
  open: boolean
  role?: DialogRole
  size?: DialogSize
  /** Nome acessível do popup e âncora do header. */
  title: ReactNode
  onOpenChange: (open: boolean) => void
}

/**
 * Quando o corpo carrega dado, `state` e `stateSurface` andam juntos: o painel
 * passa pelo `StateGuard` com o vocabulário de `state-kinds`, sem redeclarar
 * estado. Sem `state`, o corpo é sempre `children`.
 */
type DialogStateProps =
  | { state?: undefined; stateSurface?: undefined }
  | { state: SurfaceGuardState; stateSurface: Omit<StateSurfaceProps, 'kind'> }

export type DialogProps = DialogBaseProps & DialogStateProps

/**
 * Shell de popup da família: header com título, descrição opcional e fechar,
 * painel rolável, superfície de erro e rodapé fixo. Atende criação, edição e
 * confirmação sem conhecer rota, mutação, permissão nem vocabulário de domínio
 * — a vitrine compõe por cima, e `CreateDialog`, `ConfirmDialog` e
 * `DestructiveDialog` são composições deste shell.
 */
export function Dialog({
  actions,
  children,
  description,
  errorMessage = null,
  footer,
  open,
  role = 'dialog',
  size = 'md',
  state,
  stateSurface,
  title,
  onOpenChange,
}: Readonly<DialogProps>) {
  const body = state ? (
    <StateGuard state={state} surface={stateSurface}>
      {children}
    </StateGuard>
  ) : (
    children
  )

  const actionsRow = actions ? (
    <div
      className={cn(
        'absolute top-2 flex items-center gap-1',
        // Sem botão de fechar, `alertdialog` não tem de onde se afastar.
        role === 'alertdialog' ? 'end-2' : 'end-11',
      )}
      data-slot='dialog-actions'
    >
      {actions}
    </div>
  ) : null

  const error = errorMessage ? (
    <p className='px-6 pb-4 text-destructive text-sm' role='alert'>
      {errorMessage}
    </p>
  ) : null

  if (role === 'alertdialog') {
    return (
      <AlertDialogRoot onOpenChange={onOpenChange} open={open}>
        <AlertDialogPopup className={SIZE_CLASS[size]}>
          {actionsRow}
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          {body ? <div className='px-6 pb-2 text-sm'>{body}</div> : null}
          {error}
          {footer ? <AlertDialogFooter>{footer}</AlertDialogFooter> : null}
        </AlertDialogPopup>
      </AlertDialogRoot>
    )
  }

  return (
    <DialogRoot onOpenChange={onOpenChange} open={open}>
      <DialogPopup className={SIZE_CLASS[size]}>
        {actionsRow}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {body ? <DialogPanel>{body}</DialogPanel> : null}
        {error}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogPopup>
    </DialogRoot>
  )
}
