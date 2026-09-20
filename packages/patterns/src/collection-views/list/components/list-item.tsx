import { cn } from '@fifilo/ui/lib/utils'
import { type ComponentPropsWithoutRef, type ReactElement, createContext, useContext } from 'react'

export const ListItemHeadingLevelContext = createContext<2 | 3>(3)

export type ListItemDensity = 'comfortable' | 'compact'

export interface ListItemProps extends ComponentPropsWithoutRef<'article'> {
  density?: ListItemDensity
  interactive?: boolean
}
export type ListItemActionProps = ComponentPropsWithoutRef<'div'>
export type ListItemBodyProps = ComponentPropsWithoutRef<'div'>
export type ListItemContentProps = ComponentPropsWithoutRef<'div'>
export type ListItemDescriptionProps = ComponentPropsWithoutRef<'span'>
export interface ListItemFieldProps extends ComponentPropsWithoutRef<'div'> {
  always?: boolean
}
export type ListItemFooterProps = ComponentPropsWithoutRef<'footer'>
export type ListItemHeaderProps = ComponentPropsWithoutRef<'header'>
export type ListItemLeadingProps = ComponentPropsWithoutRef<'div'>
export type ListItemTitleProps = ComponentPropsWithoutRef<'h3'>
export type ListItemTitleTriggerProps = ComponentPropsWithoutRef<'button'>
export type ListItemTrailingProps = ComponentPropsWithoutRef<'div'>

export function ListItem({
  className,
  density = 'comfortable',
  interactive = true,
  ...props
}: ListItemProps): ReactElement {
  return (
    <article
      className={cn(
        'flex min-h-9 min-w-0 items-center gap-3 overflow-hidden rounded-lg px-2',
        density === 'compact' ? 'py-1' : 'py-1.5',
        interactive && 'hover:bg-muted/50',
        className,
      )}
      data-density={density}
      data-interactive={interactive ? '' : undefined}
      data-slot='list-item'
      {...props}
    />
  )
}

export function ListItemHeader({ className, ...props }: ListItemHeaderProps): ReactElement {
  return (
    <header
      className={cn('flex min-w-0 flex-1 items-center gap-2', className)}
      data-slot='list-item-header'
      {...props}
    />
  )
}

export function ListItemLeading({ className, ...props }: ListItemLeadingProps): ReactElement {
  return (
    <div
      className={cn('flex shrink-0 items-center gap-1', className)}
      data-slot='list-item-leading'
      {...props}
    />
  )
}

export function ListItemBody({ className, ...props }: ListItemBodyProps): ReactElement {
  return (
    <div
      className={cn('flex flex-col min-w-0 flex-1', className)}
      data-slot='list-item-body'
      {...props}
    />
  )
}

export function ListItemTitle({ className, ...props }: ListItemTitleProps): ReactElement {
  const Heading = useContext(ListItemHeadingLevelContext) === 2 ? 'h2' : 'h3'

  return (
    <Heading
      className={cn('min-w-0 truncate font-medium text-sm', className)}
      data-slot='list-item-title'
      {...props}
    />
  )
}

export function ListItemTitleTrigger({
  className,
  ...props
}: ListItemTitleTriggerProps): ReactElement {
  return (
    <button
      className={cn('min-w-0 truncate text-start underline-offset-4 hover:underline', className)}
      data-slot='list-item-title-trigger'
      type='button'
      {...props}
    />
  )
}

export function ListItemDescription({
  className,
  ...props
}: ListItemDescriptionProps): ReactElement {
  return (
    <span
      className={cn('min-w-0 truncate text-muted-foreground text-sm', className)}
      data-slot='list-item-description'
      {...props}
    />
  )
}

export function ListItemContent({ className, ...props }: ListItemContentProps): ReactElement {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-1 truncate text-muted-foreground text-sm',
        className,
      )}
      data-slot='list-item-content'
      {...props}
    />
  )
}

export function ListItemFooter({ className, ...props }: ListItemFooterProps): ReactElement {
  return (
    <footer
      className={cn(
        'ms-auto flex shrink-0 items-center gap-2 text-muted-foreground text-sm tabular-nums',
        className,
      )}
      data-slot='list-item-footer'
      {...props}
    />
  )
}

export function ListItemTrailing({ className, ...props }: ListItemTrailingProps): ReactElement {
  return (
    <div
      className={cn('ms-auto flex shrink-0 items-center gap-2', className)}
      data-slot='list-item-trailing'
      {...props}
    />
  )
}

export function ListItemField({
  always = false,
  className,
  ...props
}: ListItemFieldProps): ReactElement {
  return (
    <div
      className={cn('shrink-0 items-center', always ? 'flex' : 'hidden lg:flex', className)}
      data-slot='list-item-field'
      {...props}
    />
  )
}

export function ListItemAction({ className, ...props }: ListItemActionProps): ReactElement {
  return (
    <div
      className={cn('flex shrink-0 items-center', className)}
      data-slot='list-item-action'
      {...props}
    />
  )
}
