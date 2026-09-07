import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Building2,
  LayoutDashboard,
  SettingsIcon,
  TagIcon,
  WalletIcon,
} from 'lucide-react'

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
      {
        availability: 'active',
        icon: WalletIcon,
        id: 'accounts',
        label: 'Contas',
        to: '/accounts',
      },
      {
        availability: 'active',
        icon: ArrowLeftRight,
        id: 'transactions',
        label: 'Transações',
        to: '/transactions',
      },
      {
        availability: 'active',
        icon: TagIcon,
        id: 'categories',
        label: 'Categorias',
        to: '/categories',
      },
      {
        availability: 'active',
        icon: SettingsIcon,
        id: 'settings',
        label: 'Configurações',
        to: '/settings',
      },
    ],
  },
] as const

export const APP_NAV_ITEMS: readonly AppNavItem[] = APP_NAV_GROUPS.flatMap((group) => group.items)
