import { cn } from '@twincam/ui/lib/utils'
import type { ReactNode } from 'react'

interface PageRootProps {
  children: ReactNode
  className?: string
}

interface PageHeaderProps {
  actions?: ReactNode
  className?: string
  description?: ReactNode
  title: ReactNode
}

interface PageBodyProps {
  children: ReactNode
  className?: string
}

interface PageFooterProps {
  children: ReactNode
  className?: string
}

function PageRoot({ children, className }: Readonly<PageRootProps>) {
  return <section className={cn('space-y-6', className)}>{children}</section>
}

function PageHeader({ actions, className, description, title }: Readonly<PageHeaderProps>) {
  return (
    <header
      className={cn(
        'flex flex-col items-center gap-4 py-2 sm:px-4 md:flex-row md:justify-between',
        className,
      )}
    >
      <div className='min-w-0'>
        <h1 className='font-semibold text-lg'>{title}</h1>
        {description ? <p className='text-muted-foreground text-sm'>{description}</p> : null}
      </div>
      {actions ? <div className='flex flex-wrap items-center gap-2'>{actions}</div> : null}
    </header>
  )
}

function PageBody({ children, className }: Readonly<PageBodyProps>) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

function PageFooter({ children, className }: Readonly<PageFooterProps>) {
  return <footer className={cn(className)}>{children}</footer>
}

export const Page = Object.assign(PageRoot, {
  Body: PageBody,
  Footer: PageFooter,
  Header: PageHeader,
})
