import { Outlet, createFileRoute } from '@tanstack/react-router'
import { clientEnv } from '@twincam/infra-env/client'
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
