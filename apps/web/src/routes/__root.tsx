import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Link, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { clientEnv } from '@twincam/infra-env/client'
import { AnchoredToastProvider, ToastProvider } from '@twincam/ui/components/toast'
import type { ReactNode } from 'react'

import appCss from '../styles/global.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: clientEnv.VITE_APP_NAME },
      {
        name: 'description',
        content: 'Twincam product foundation built with Bun and TanStack Start.',
      },
    ],
  }),
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
})

function RootNotFound() {
  return (
    <section className='mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col justify-center gap-4 px-6 py-16'>
      <div className='space-y-2'>
        <p className='font-medium text-muted-foreground text-sm uppercase tracking-[0.35em]'>
          Página não encontrada
        </p>
        <h1 className='font-semibold text-3xl tracking-tight'>O caminho solicitado não existe.</h1>
        <p className='max-w-prose text-muted-foreground text-sm sm:text-base'>
          Verifique a URL ou volte para uma área conhecida do app.
        </p>
      </div>
      <div className='flex flex-wrap gap-3'>
        <Link
          className='inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground'
          to='/dashboard'
        >
          Ir para dashboard
        </Link>
        <Link
          className='inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground'
          to='/login'
        >
          Entrar novamente
        </Link>
      </div>
    </section>
  )
}
function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className='dark' lang='pt-BR'>
      <head>
        <HeadContent />
      </head>
      <body className='h-svh overflow-hidden bg-background text-foreground'>
        <ToastProvider>
          <AnchoredToastProvider>{children}</AnchoredToastProvider>
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}
