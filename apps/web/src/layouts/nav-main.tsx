import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@twincam/ui/components/sidebar'

import type { AppNavGroup, AppNavItem } from './app-nav'

interface NavMainProps {
  groups: readonly AppNavGroup[]
}

function isRouteActive(matchRoute: ReturnType<typeof useMatchRoute>, item: AppNavItem): boolean {
  if (item.availability !== 'active' || !item.to) return false

  return Boolean(matchRoute({ includeSearch: false, fuzzy: true, to: item.to }))
}

export function NavMain({ groups }: Readonly<NavMainProps>) {
  const matchRoute = useMatchRoute()

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items
                .filter((item) => item.availability !== 'hidden')
                .map((item) => {
                  const Icon = item.icon
                  const active = isRouteActive(matchRoute, item)

                  return (
                    <SidebarMenuItem key={item.id}>
                      {item.availability === 'active' && item.to ? (
                        <SidebarMenuButton
                          aria-current={active ? 'page' : undefined}
                          isActive={active}
                          render={<Link search={item.search} to={item.to} />}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton disabled title='Disponível em breve'>
                          <Icon />
                          <span>{item.label}</span>
                          <SidebarMenuBadge>Em breve</SidebarMenuBadge>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
