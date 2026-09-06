import { SidebarInset, SidebarProvider } from '@twincam/ui/components/sidebar'
import type { CSSProperties, ReactNode } from 'react'

import { AppContent } from './app-content'
import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

interface AppLayoutProps {
  children: ReactNode
  organizationName?: string
  userName?: string
}

const sidebarInsetStyle = {
  '--header-height': 'calc(var(--spacing) * 12)',
  '--sidebar-width': 'calc(var(--spacing) * 72)',
} as CSSProperties

export function AppLayout({ children, organizationName, userName }: Readonly<AppLayoutProps>) {
  return (
    <SidebarProvider className='' style={sidebarInsetStyle}>
      <AppSidebar organizationName={organizationName} userName={userName} />

      <SidebarInset className='overflow-hidden border border-border/60'>
        <AppHeader />
        <AppContent>{children}</AppContent>
      </SidebarInset>
    </SidebarProvider>
  )
}
