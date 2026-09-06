import { useRouterState } from '@tanstack/react-router'
import { clientEnv } from '@twincam/infra-env/client'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@twincam/ui/components/breadcrumb'
import { Separator } from '@twincam/ui/components/separator'
import { SidebarTrigger } from '@twincam/ui/components/sidebar'

const TOP_LEVEL_BREADCRUMBS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Organização', path: '/organization' },
  { label: 'Criar organização', path: '/onboarding' },
  { label: 'Aceitar convite', path: '/accept-invitation' },
] as const

function resolveTopLevelBreadcrumb(pathname: string): string {
  return (
    TOP_LEVEL_BREADCRUMBS.find(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    )?.label ?? 'Twincam'
  )
}

export function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const topLevel = resolveTopLevelBreadcrumb(pathname)

  return (
    <header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
      <SidebarTrigger aria-label='Alternar sidebar' className='-ml-1' />
      <Separator className='mr-2 data-[orientation=vertical]:h-4' orientation='vertical' />
      <Breadcrumb>
        <BreadcrumbList className='text-xs uppercase'>
          <BreadcrumbItem>
            <BreadcrumbPage>{topLevel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className='ml-auto flex items-center gap-2'>
        <span className='text-muted-foreground text-xs'>{clientEnv.VITE_APP_ENV}</span>
      </div>
    </header>
  )
}
