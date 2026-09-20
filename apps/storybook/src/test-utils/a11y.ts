/**
 * Rules disabled in the catalog baseline. The list starts empty: a rule enters
 * here only with a measured violation count and an owner, and leaves when that
 * debt is paid. `a11y.test: 'todo'` in the preview reports without failing, so
 * a new story must not add violations even while the gate is not blocking.
 */
export const A11Y_BASELINE_RULES: Array<{ enabled: boolean; id: string }> = []

/**
 * The baseline reports without failing (`a11y.test: 'todo'`). A story that owns
 * a tonal catalog opts into contrast as a blocking rule for itself.
 */
export const enforceColorContrast = () => ({
  test: 'error' as const,
  config: {
    rules: [
      ...A11Y_BASELINE_RULES.filter((rule) => rule.id !== 'color-contrast'),
      { id: 'color-contrast', enabled: true },
    ],
  },
})
