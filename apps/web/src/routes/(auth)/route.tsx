import { clientEnv } from '@fifilo/infra-env/client'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppAuthLayout } from '../../layouts/app-auth-layout'

export const Route = createFileRoute('/(auth)')({
  component: AuthRoute,
})

function AuthRoute() {
  return (
    <AppAuthLayout appName={clientEnv.VITE_APP_NAME}>
      <Outlet />
    </AppAuthLayout>
  )
}
