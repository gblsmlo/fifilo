import { Text } from '@fifilo/ui/components/text'
import { cn } from '@fifilo/ui/lib/utils'
import type { ReactNode } from 'react'

export type PageWidth = 'lg' | 'md' | 'sm' | 'xl'

interface PageRootProps {
  children: ReactNode
  className?: string
  /** Centers the page in a column of this width; absent, the layout owns the width. */
  width?: PageWidth
}

interface PageHeaderProps {
  actions?: ReactNode
  /** `center` is the access column; `start` the app pages behind the sidebar. */
  align?: 'center' | 'start'
  className?: string
  description?: ReactNode
  /** Above the title: a role badge, a breadcrumb, a status. */
  meta?: ReactNode
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

const WIDTH_CLASS: Record<PageWidth, string> = {
  lg: 'max-w-5xl',
  md: 'max-w-3xl',
  sm: 'max-w-xl',
  xl: 'max-w-6xl',
}

const HEADER_ALIGN_CLASS = {
  center: 'flex flex-col items-center gap-4 py-2 sm:px-4 md:flex-row md:justify-between',
  start: 'flex flex-col gap-4 md:flex-row md:items-start md:justify-between',
} as const

function PageRoot({ children, className, width }: Readonly<PageRootProps>) {
  return (
    <section
      className={cn('space-y-6', width && cn('mx-auto w-full p-6', WIDTH_CLASS[width]), className)}
      data-slot='page'
    >
      {children}
    </section>
  )
}

function PageHeader({
  actions,
  align = 'center',
  className,
  description,
  meta,
  title,
}: Readonly<PageHeaderProps>) {
  return (
    <header className={cn(HEADER_ALIGN_CLASS[align], className)} data-slot='page-header'>
      <div className='flex min-w-0 flex-col gap-1.5'>
        {meta ? <div data-slot='page-meta'>{meta}</div> : null}
        <Text render={<h1>{title}</h1>} size='lg' weight='semibold' />
        {description ? (
          <Text foreground='muted' render={<p />} size='sm'>
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <div className='flex flex-wrap items-center gap-2'>{actions}</div> : null}
    </header>
  )
}

function PageBody({ children, className }: Readonly<PageBodyProps>) {
  return (
    <div className={cn('space-y-4', className)} data-slot='page-body'>
      {children}
    </div>
  )
}

function PageFooter({ children, className }: Readonly<PageFooterProps>) {
  return (
    <footer className={cn(className)} data-slot='page-footer'>
      {children}
    </footer>
  )
}

export const Page = Object.assign(PageRoot, {
  Body: PageBody,
  Footer: PageFooter,
  Header: PageHeader,
})
