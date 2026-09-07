import type { Theme } from '@fifilo/core/settings'
import { SidebarInset, SidebarProvider } from '@fifilo/ui/components/sidebar'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect } from 'react'

import { AppContent } from './app-content'
import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

interface AppLayoutProps {
  children: ReactNode
  organizationName?: string
  /** The viewer's own preference (Fase 06 § Modelagem); `undefined` while it has not loaded yet leaves the current class alone. */
  theme?: Theme
  userName?: string
}

const sidebarInsetStyle = {
  '--header-height': 'calc(var(--spacing) * 12)',
  '--sidebar-width': 'calc(var(--spacing) * 72)',
} as CSSProperties

/**
 * `.dark` on the document root, not a state hook per component: every
 * `dark:` Tailwind variant in `packages/ui` already targets it
 * (`global.css`'s `@custom-variant dark (&:is(.dark *))`), so this is the one
 * place that reads the preference and the entire app follows for free.
 */
function useAppliedTheme(theme: Theme | undefined) {
  useEffect(() => {
    if (!theme) return

    const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark())
    document.documentElement.classList.toggle('dark', isDark)

    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => document.documentElement.classList.toggle('dark', media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])
}

export function AppLayout({
  children,
  organizationName,
  theme,
  userName,
}: Readonly<AppLayoutProps>) {
  useAppliedTheme(theme)

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
