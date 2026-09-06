import { Link } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@twincam/ui/components/sidebar'
import { Sparkles } from 'lucide-react'
import type { ComponentProps } from 'react'

import { APP_NAV_GROUPS } from './app-nav'
import { NavMain } from './nav-main'
import { NavUser } from './nav-user'

interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  organizationName?: string
  userName?: string
}

export function AppSidebar({ organizationName, userName, ...props }: Readonly<AppSidebarProps>) {
  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className='data-[slot=sidebar-menu-button]:p-1.5!'
              render={<Link to='/dashboard' />}
              size='lg'
            >
              <Sparkles className='size-5!' />
              <span className='text-base font-semibold'>Twincam</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={APP_NAV_GROUPS} />
      </SidebarContent>

      <NavUser organizationName={organizationName} userName={userName} />
    </Sidebar>
  )
}
