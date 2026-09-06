import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Building2, LayoutDashboard } from 'lucide-react'

export type AppNavAvailability = 'active' | 'planned' | 'hidden'

type AppNavItemBase = {
  id: string
  label: string
  icon: LucideIcon
}

type ActiveAppNavItem = AppNavItemBase & {
  availability: Extract<AppNavAvailability, 'active'>
  to: LinkProps['to']
  search?: LinkProps['search']
}

type PlannedAppNavItem = AppNavItemBase & {
  availability: Exclude<AppNavAvailability, 'active'>
  to?: never
  search?: never
}

export type AppNavItem = ActiveAppNavItem | PlannedAppNavItem

export type AppNavGroup = {
  id: string
  label: string
  items: readonly AppNavItem[]
}

export const APP_NAV_GROUPS: readonly AppNavGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        availability: 'active',
        icon: LayoutDashboard,
        id: 'dashboard',
        label: 'Dashboard',
        to: '/dashboard',
      },
      {
        availability: 'active',
        icon: Building2,
        id: 'organization',
        label: 'Organização',
        to: '/organization',
      },
    ],
  },
] as const

export const APP_NAV_ITEMS: readonly AppNavItem[] = APP_NAV_GROUPS.flatMap((group) => group.items)
