import type { ReactNode } from 'react'

interface OnboardingLayoutProps {
  appName: string
  children: ReactNode
  progress?: ReactNode
}

export function OnboardingLayout({ appName, children, progress }: Readonly<OnboardingLayoutProps>) {
  return (
    <main className='flex min-h-screen w-full items-center justify-center bg-muted/30 p-4 sm:p-8'>
      <div className='flex w-full max-w-2xl flex-col gap-8'>
        <div className='flex items-center justify-between text-muted-foreground text-sm'>
          <span className='font-semibold text-foreground'>{appName}</span>
          <span>{progress ?? 'Configuração inicial'}</span>
        </div>
        {children}
      </div>
    </main>
  )
}
