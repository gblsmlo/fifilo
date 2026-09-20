import { Button } from '@fifilo/ui/components/button'
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@fifilo/ui/components/menu'
import { EllipsisIcon, ExternalLinkIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { ListItemAction } from './list-item'

export interface ListItemActionsMenuProps {
  ariaLabel: string
  children?: ReactNode
  onDelete?: () => void
  onEdit?: () => void
  onOpen?: () => void
}

export function ListItemActionsMenu({
  ariaLabel,
  children,
  onDelete,
  onEdit,
  onOpen,
}: Readonly<ListItemActionsMenuProps>): ReactElement {
  return (
    <ListItemAction
      className='pointer-coarse:opacity-100 shrink-0 opacity-0 transition-opacity focus-within:opacity-100 has-data-[popup-open]:opacity-100 group-hover:opacity-100'
      data-slot='list-item-actions-menu'
    >
      <Menu>
        <MenuTrigger
          render={
            <Button aria-label={ariaLabel} size='icon-sm' type='button' variant='ghost'>
              <EllipsisIcon aria-hidden='true' />
            </Button>
          }
        />
        <MenuPopup align='end'>
          <MenuItem disabled={!onOpen} onClick={onOpen}>
            <ExternalLinkIcon aria-hidden='true' />
            Abrir
          </MenuItem>
          {onEdit ? (
            <MenuItem onClick={onEdit}>
              <PencilIcon aria-hidden='true' />
              Editar
            </MenuItem>
          ) : null}
          {children}
          {onDelete ? (
            <MenuItem onClick={onDelete} variant='destructive'>
              <Trash2Icon aria-hidden='true' />
              Apagar
            </MenuItem>
          ) : null}
        </MenuPopup>
      </Menu>
    </ListItemAction>
  )
}
