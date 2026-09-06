import { OrganizationOnboardingPage } from '@features/organizations'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/onboarding')({
  beforeLoad: ({ context }) => {
    if (context.currentOrganization) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: OrganizationOnboardingPage,
})
