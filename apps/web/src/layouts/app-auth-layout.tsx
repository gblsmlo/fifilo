import type { ReactNode } from 'react'

import authBackground from '../assets/bg-auth.jpg'

interface AppAuthLayoutProps {
  /** Product name shown above the form. It arrives by prop so the layout never reads the environment: the route does. */
  appName: string
  children: ReactNode
}

export function AppAuthLayout({ appName, children }: Readonly<AppAuthLayoutProps>) {
  return (
    <div className='grid min-h-svh overflow-hidden bg-background lg:grid-cols-5'>
      <div className='flex flex-col gap-4 p-6 md:p-10 lg:col-span-3'>
        <div className='flex flex-col gap-1 md:items-start'>
          <span className='text-muted-foreground text-xs uppercase tracking-[0.35em]'>
            {appName}
          </span>
          <span className='font-semibold text-foreground text-sm'>Acesso seguro</span>
        </div>
        <div className='flex flex-1 items-center justify-center'>
          <div className='w-full max-w-sm'>{children}</div>
        </div>
      </div>
      <div className='relative hidden overflow-hidden rounded-2xl lg:col-span-2 lg:m-6 lg:block'>
        <img
          alt=''
          aria-hidden='true'
          className='h-full w-full object-cover'
          src={authBackground}
        />
        <div className='absolute inset-0 bg-gradient-to-br from-background/10 via-background/30 to-background/70' />
      </div>
    </div>
  )
}
