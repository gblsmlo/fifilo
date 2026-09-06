import { signOut as signOutSession } from '@features/auth'
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@fifilo/ui/components/sidebar'
import { LogOut } from 'lucide-react'

interface NavUserProps {
  organizationName?: string
  userName?: string
}

function initials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function NavUser({ organizationName, userName }: Readonly<NavUserProps>) {
  const signOut = async () => {
    await signOutSession()
    window.location.assign('/login')
  }

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={signOut} size='lg' title='Sair'>
            <span className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-medium'>
              {initials(userName)}
            </span>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='font-medium truncate'>{userName ?? 'Workspace user'}</span>
              <span className='text-muted-foreground truncate'>
                {organizationName ?? 'Sem organização'}
              </span>
            </div>
            <LogOut className='ml-auto size-4' />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
