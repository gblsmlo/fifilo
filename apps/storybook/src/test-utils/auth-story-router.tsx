import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { ComponentType } from 'react'

const AUTH_PATHS = [
  '/login',
  '/sign-up',
  '/forgotten-password',
  '/reset-password',
  '/two-factor',
] as const

/**
 * Under `@storybook/react-vite` there is no automatic router wrapper, so a
 * `Link` outside router context throws. The story mounts the minimal tree with
 * the access journey destinations and leaves the component on a neutral route:
 * resolving the story through the real tree would erase `args` and controls.
 */
export function withAuthRoute(Story: ComponentType) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const storyRoute = createRoute({
    component: () => <Story />,
    getParentRoute: () => rootRoute,
    path: '/',
  })
  const destinations = AUTH_PATHS.map((path) =>
    createRoute({ component: () => null, getParentRoute: () => rootRoute, path }),
  )
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([storyRoute, ...destinations]),
  })

  return <RouterProvider router={router} />
}
