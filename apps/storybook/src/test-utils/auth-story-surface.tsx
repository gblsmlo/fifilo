import { ToastProvider } from '@twincam/ui/components/toast'
import type { ComponentType } from 'react'

/**
 * Frame of the form stories: the narrow column the form is reviewed in, plus
 * the `ToastProvider` where the submission result appears. A form story does
 * not mount the `AppAuthLayout` on purpose: it documents the component, not
 * the screen. The column width is the layout's contract, asserted in
 * `Layout/Auth`.
 */
export function withAuthSurface(Story: ComponentType) {
  return (
    <ToastProvider>
      <div className='flex justify-center p-6'>
        <div className='w-full max-w-sm' data-slot='auth-form-surface'>
          <Story />
        </div>
      </div>
    </ToastProvider>
  )
}
