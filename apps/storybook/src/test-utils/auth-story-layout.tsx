import { ToastProvider } from '@fifilo/ui/components/toast'
import type { ComponentType } from 'react'

import { AppAuthLayout } from '../../../web/src/layouts/app-auth-layout'

export const AUTH_STORY_APP_NAME = 'Fifilo'

/**
 * Frame of the page stories: the real access layout, not a replica. The
 * `ToastProvider` enters here because in the app it lives in `__root`, above
 * the route group, and cannot move to the preview: `toastManager` is a
 * singleton, and two active providers would render the same toast twice.
 */
export function withAuthLayout(Story: ComponentType) {
  return (
    <ToastProvider>
      <AppAuthLayout appName={AUTH_STORY_APP_NAME}>
        <Story />
      </AppAuthLayout>
    </ToastProvider>
  )
}
