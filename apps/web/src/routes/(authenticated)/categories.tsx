import { CategoriesPage, categoriesQueryOptions } from '@features/categories'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/categories')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: CategoriesPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
})
