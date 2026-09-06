/**
 * `control` maps for props the docgen does not type.
 *
 * `react-docgen`, the default, emits some props with only `defaultValue` and
 * `required`, without `tsType`; without a type Storybook falls back to the
 * object editor for booleans and to free text for closed unions. Switching to
 * `react-docgen-typescript` destroys docgen coverage instead of fixing it, so
 * the control is declared per story. Only the control type lives here: the
 * prop description belongs to the component's JSDoc.
 */
export const booleanArgType = { control: 'boolean' } as const

export const stateSurfaceKindArgType = {
  kind: {
    control: 'select',
    options: [
      'empty',
      'no-result',
      'integration-disconnected',
      'sync-pending',
      'error',
      'permission',
    ],
  },
} as const
