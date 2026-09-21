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

const ONBOARDING_PATHS = ['/dashboard', '/transactions', '/onboarding/setup'] as const

/**
 * Under `@storybook/react-vite` there is no automatic router wrapper, so a
 * `Link` outside router context throws. The story mounts the minimal tree with
 * the journey's destinations and leaves the component on a neutral route:
 * resolving the story through the real tree would erase `args` and controls.
 */
const withRouteDestinations = (paths: readonly string[]) => (Story: ComponentType) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const storyRoute = createRoute({
    component: () => <Story />,
    getParentRoute: () => rootRoute,
    path: '/',
  })
  const destinations = paths.map((path) =>
    createRoute({ component: () => null, getParentRoute: () => rootRoute, path }),
  )
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([storyRoute, ...destinations]),
  })

  return <RouterProvider router={router} />
}

export const withAuthRoute = withRouteDestinations(AUTH_PATHS)

export const withOnboardingRoute = withRouteDestinations(ONBOARDING_PATHS)
